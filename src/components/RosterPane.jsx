import React, { useRef, useEffect, useState } from "react";
import Papa from "papaparse";
import {
  Upload,
  ArrowRightLeft,
  Play,
  Pause,
  Moon,
  Sun,
  MoreVertical,
} from "lucide-react";
import clsx from "clsx";

export default function RosterPane({
  roster,
  setRoster,
  activeRAIndex,
  setActiveRAIndex,
  activeDutyType,
  setActiveDutyType,
  dutyMode,
  setDutyMode,
  isPicking,
  setIsPicking,
  isSwapping,
  setIsSwapping,
  swapSource,
  setSwapSource,
  draftOrder,
  setDraftOrder,
  showRecentQRs,
  setShowRecentQRs,
  showTextQR,
  setShowTextQR,
  isDarkMode,
  setIsDarkMode,
}) {
  const fileInputRef = useRef(null);
  const activeRowRef = useRef(null);
  const optionsRef = useRef(null);

  const [showNamesOnly, setShowNamesOnly] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (activeRowRef.current)
      activeRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [activeRAIndex]);

  // Click outside listener for the 3-dot dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target))
        setShowOptions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNiceDate = (val) => {
    if (!val) return "Unassigned";
    const parts = val.split("-");
    if (parts.length < 3) return "Error";
    return `${parts[1]}/${parts[2]}`;
  };

  const handleImportClick = () => {
    const hasAssignments = roster.some((ra) =>
      ["d1", "d2", "d3", "d4", "d5", "d6", "w1", "w2", "w3"].some(
        (k) => ra[k] !== null,
      ),
    );
    if (hasAssignments) {
      if (
        !window.confirm(
          "WARNING: Importing a new CSV will clear your current roster and delete all picked duties. Are you sure you want to start from scratch?",
        )
      ) {
        return;
      }
    }
    fileInputRef.current.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        let parsedRoster = [];
        const hasIndex = headers.some((h) => h.toLowerCase().includes("index"));
        const nameHeader =
          headers.find(
            (h) =>
              h.toLowerCase().includes("name") ||
              h.toLowerCase().includes("assistant"),
          ) || headers[0];

        if (hasIndex) {
          const indexHeader = headers.find((h) =>
            h.toLowerCase().includes("index"),
          );
          parsedRoster = data
            .map((row) => ({
              index: parseInt(row[indexHeader], 10),
              name: row[nameHeader],
              d1: null,
              d2: null,
              d3: null,
              d4: null,
              d5: null,
              d6: null,
              w1: null,
              w2: null,
              w3: null,
            }))
            .sort((a, b) => a.index - b.index);
        } else {
          parsedRoster = data.map((row, i) => ({
            index: i + 1,
            name: row[nameHeader],
            d1: null,
            d2: null,
            d3: null,
            d4: null,
            d5: null,
            d6: null,
            w1: null,
            w2: null,
            w3: null,
          }));
        }
        setRoster(parsedRoster);
        setActiveRAIndex(1);
        setActiveDutyType(dutyMode === "weekdays" ? "d1" : "w1");
        setIsPicking(false);
      },
    });
    event.target.value = null;
  };

  const togglePick = () => {
    if (isSwapping) setIsSwapping(false);
    if (!isPicking) {
      if (!activeRAIndex) setActiveRAIndex(1);
      if (!activeDutyType)
        setActiveDutyType(dutyMode === "weekdays" ? "d1" : "w1");
    }
    setIsPicking(!isPicking);
  };

  const c_bg = isDarkMode ? "bg-slate-800" : "bg-gray-50";
  const c_border = isDarkMode ? "border-slate-700" : "border-gray-200";
  const c_text = isDarkMode ? "text-slate-300" : "text-gray-600";
  const c_inputBg = isDarkMode
    ? "bg-slate-700 text-slate-200 border-slate-600"
    : "bg-white text-gray-700 border-gray-300";

  const isD5Full = roster.length > 0 && roster.every((ra) => ra.d5 !== null);
  const showD6 =
    activeDutyType === "d6" || isD5Full || roster.some((ra) => ra.d6);
  const isW2Full = roster.length > 0 && roster.every((ra) => ra.w2 !== null);
  const showW3 =
    activeDutyType === "w3" || isW2Full || roster.some((ra) => ra.w3);

  const colsWeekdays = ["d1", "d2", "d3", "d4", "d5"];
  if (showD6) colsWeekdays.push("d6");

  const colsWeekends = ["w1", "w2"];
  if (showW3) colsWeekends.push("w3");

  const columnsToShow = dutyMode === "weekdays" ? colsWeekdays : colsWeekends;

  return (
    <div
      className={`flex flex-col h-full ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
    >
      <div
        className={`p-4 border-b flex flex-col gap-3 flex-shrink-0 z-20 ${c_bg} ${c_border}`}
      >
        <div
          className={`flex items-center gap-2 text-[10px] font-bold ${c_text}`}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />

          <button
            onClick={handleImportClick}
            className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
          >
            <Upload size={12} /> Import
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 rounded transition ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-yellow-400" : "bg-gray-200 hover:bg-gray-300 text-slate-800"}`}
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* 3-DOT MENU FOR CHECKBOXES */}
          <div className="relative ml-auto" ref={optionsRef}>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-1.5 rounded transition flex items-center justify-center border ${isDarkMode ? "bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-300" : "bg-white border-gray-300 hover:bg-gray-100 text-gray-700"}`}
            >
              <MoreVertical size={14} />
            </button>

            {showOptions && (
              <div
                className={`absolute top-full right-0 mt-2 p-4 rounded-xl shadow-xl z-50 flex flex-col gap-4 min-w-[160px] border ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-200 text-gray-700"}`}
              >
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={showNamesOnly}
                    onChange={(e) => setShowNamesOnly(e.target.checked)}
                    className="rounded"
                  />
                  Names Only
                </label>
                <div
                  className={`border-t ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
                ></div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={showRecentQRs}
                    onChange={(e) => setShowRecentQRs(e.target.checked)}
                    className="rounded"
                  />
                  Show Bottom QRs
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={showTextQR}
                    onChange={(e) => setShowTextQR(e.target.checked)}
                    className="rounded"
                  />
                  Top Text QR
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <select
            value={draftOrder}
            onChange={(e) => setDraftOrder(e.target.value)}
            className={`flex-1 text-[10px] font-bold uppercase rounded px-1 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer border ${c_inputBg}`}
          >
            <option value="wraparound">Wraparound</option>
            <option value="snake">Snake</option>
          </select>

          <button
            onClick={() => {
              setIsPicking(false);
              setIsSwapping(!isSwapping);
              setSwapSource(null);
            }}
            className={clsx(
              "flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase rounded transition flex-1",
              isSwapping
                ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                : isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
            )}
          >
            <ArrowRightLeft size={12} /> Swap
          </button>
        </div>

        <div
          className={`flex rounded-md shadow-sm border overflow-hidden w-full ${c_border}`}
        >
          <button
            onClick={() => {
              setDutyMode("weekends");
              setIsPicking(false);
              setActiveDutyType("w1");
            }}
            className={clsx(
              "flex-1 py-1.5 text-[10px] font-bold uppercase transition",
              dutyMode === "weekends"
                ? "bg-purple-600 text-white"
                : isDarkMode
                  ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  : "bg-white text-gray-600 hover:bg-gray-100",
            )}
          >
            Weekends
          </button>
          <button
            onClick={() => {
              setDutyMode("weekdays");
              setIsPicking(false);
              setActiveDutyType("d1");
            }}
            className={clsx(
              "flex-1 py-1.5 text-[10px] font-bold uppercase transition",
              dutyMode === "weekdays"
                ? "bg-blue-600 text-white"
                : isDarkMode
                  ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  : "bg-white text-gray-600 hover:bg-gray-100",
            )}
          >
            Weekdays
          </button>
        </div>

        <button
          onClick={(e) => {
            togglePick();
            e.currentTarget.blur();
          }}
          disabled={roster.length === 0}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            isPicking
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white",
          )}
        >
          {isPicking ? <Pause size={18} /> : <Play size={18} />}
          {isPicking ? "PAUSE PICK" : `START ${dutyMode.toUpperCase()}?`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar z-0">
        {roster.length === 0 ? (
          <div
            className={`text-center mt-10 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
          >
            <p>No Roster.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {!showNamesOnly && (
              <div
                className={`flex text-[10px] font-bold uppercase px-1 mb-1 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
              >
                <div className="w-5 text-center">#</div>
                <div className="flex-1 ml-1 truncate">Name</div>
                <div className="w-auto text-center pr-1">
                  {dutyMode === "weekdays" ? "Weekdays" : "Weekends"}
                </div>
              </div>
            )}

            {roster.map((ra) => {
              const isActiveRA = isPicking && activeRAIndex === ra.index;

              return (
                <div
                  key={ra.index}
                  ref={isActiveRA ? activeRowRef : null}
                  className={clsx(
                    "flex items-center p-2 rounded-lg border transition-all duration-200",
                    isActiveRA
                      ? isDarkMode
                        ? "bg-slate-800 border-slate-500 shadow-sm"
                        : "bg-slate-100 border-slate-400 shadow-sm"
                      : isDarkMode
                        ? "bg-slate-900 border-slate-800 hover:border-slate-600"
                        : "bg-white border-gray-100 hover:border-gray-300",
                  )}
                >
                  <div
                    className={`w-5 text-center text-[16px] font-bold ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {ra.index}
                  </div>

                  <div
                    className={clsx(
                      "flex-1 font-medium truncate ml-2",
                      showNamesOnly ? "text-[24px]" : "text-[18px]",
                      isActiveRA
                        ? isDarkMode
                          ? "text-white"
                          : "text-slate-900"
                        : isDarkMode
                          ? "text-slate-300"
                          : "text-gray-700",
                    )}
                  >
                    {ra.name}
                  </div>

                  {!showNamesOnly && (
                    <div className="flex gap-1 ml-2">
                      {columnsToShow.map((type) => {
                        const isTargetCell =
                          isActiveRA && activeDutyType === type;
                        const assignedVal = ra[type];
                        const isSource =
                          swapSource &&
                          swapSource.raIndex === ra.index &&
                          swapSource.dutyType === type;
                        const dutyColor =
                          dutyMode === "weekdays"
                            ? "bg-blue-500 border-blue-600 ring-blue-300"
                            : "bg-purple-500 border-purple-600 ring-purple-300";

                        return (
                          <div
                            key={type}
                            title={
                              assignedVal
                                ? getNiceDate(assignedVal)
                                : "Unassigned"
                            }
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                setActiveRAIndex(ra.index);
                                setActiveDutyType(type);
                                return;
                              }
                              if (isSwapping && assignedVal) {
                                const parts = assignedVal.split("-");
                                setSwapSource({
                                  raIndex: ra.index,
                                  dutyType: type,
                                  date: `${parts[0]}-${parts[1]}-${parts[2]}`,
                                  slot: parseInt(parts[3]),
                                  currentOwnerName: ra.name,
                                });
                              }
                            }}
                            className={clsx(
                              "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all border",
                              isSource
                                ? "bg-indigo-500 text-white ring-2 ring-indigo-300 animate-pulse cursor-pointer"
                                : isTargetCell
                                  ? `${dutyColor} text-white ring-2`
                                  : assignedVal
                                    ? isSwapping
                                      ? "bg-green-500 hover:bg-indigo-400 cursor-pointer text-white border-green-600"
                                      : "bg-green-500 text-white border-green-600 cursor-help"
                                    : isDarkMode
                                      ? "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 cursor-pointer"
                                      : "bg-gray-50 text-gray-300 border-gray-200 hover:bg-gray-200 cursor-pointer",
                            )}
                          >
                            {assignedVal ? "✓" : type.replace(/w|d/, "")}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
