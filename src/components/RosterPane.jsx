import React, { useRef, useEffect } from "react";
import Papa from "papaparse";
import { Upload, ArrowRightLeft, Play, Pause } from "lucide-react";
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
}) {
  const fileInputRef = useRef(null);
  const activeRowRef = useRef(null);

  // center selected ra
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeRAIndex]);

  const getNiceDate = (val) => {
    if (!val) return "Unassigned";
    // val is "2024-10-24-1" -> split gives ["2024", "10", "24", "1"]
    const parts = val.split("-");
    if (parts.length < 3) return "Error";
    return `${parts[1]}/${parts[2]}`; // "10/24" for pop-ups and qr
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
              w1: null,
              w2: null,
            }))
            .sort((a, b) => a.index - b.index);
        } else {
          const newArr = [...data];
          for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
          }
          parsedRoster = newArr.map((row, i) => ({
            index: i + 1,
            name: row[nameHeader],
            d1: null,
            d2: null,
            d3: null,
            d4: null,
            d5: null,
            w1: null,
            w2: null,
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

  const toggleSwapMode = () => {
    setIsPicking(false);
    setIsSwapping(!isSwapping);
    setSwapSource(null);
  };

  const switchMode = (mode) => {
    setDutyMode(mode);
    setIsPicking(false);
    setActiveDutyType(mode === "weekdays" ? "d1" : "w1");
    setActiveRAIndex(1);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3 flex-shrink-0">
        <div className="flex gap-2 w-full">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white text-xs font-bold uppercase rounded hover:bg-slate-700 transition"
          >
            <Upload size={14} /> Import
          </button>
          <button
            onClick={toggleSwapMode}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase rounded transition",
              isSwapping
                ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300",
            )}
          >
            <ArrowRightLeft size={14} /> {isSwapping ? "Exit Swap" : "Swap"}
          </button>
        </div>

        <div className="flex rounded-md shadow-sm border border-gray-300 overflow-hidden w-full">
          <button
            onClick={() => switchMode("weekdays")}
            className={clsx(
              "flex-1 py-1.5 text-[10px] font-bold uppercase transition",
              dutyMode === "weekdays"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100",
            )}
          >
            Weekdays
          </button>
          <button
            onClick={() => switchMode("weekends")}
            className={clsx(
              "flex-1 py-1.5 text-[10px] font-bold uppercase transition",
              dutyMode === "weekends"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100",
            )}
          >
            Weekends
          </button>
        </div>

        <button
          onClick={togglePick}
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

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {roster.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>No Roster.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">
              <div className="w-6 text-center">#</div>
              <div className="flex-1 ml-2">Name</div>
              <div className="text-center">
                {dutyMode === "weekdays" ? "Weekdays" : "Weekends"}
              </div>
            </div>
            {roster.map((ra) => {
              const isActiveRA = isPicking && activeRAIndex === ra.index;
              const columnsToShow =
                dutyMode === "weekdays"
                  ? ["d1", "d2", "d3", "d4", "d5"]
                  : ["w1", "w2"];
              const activeColor =
                dutyMode === "weekdays"
                  ? "bg-blue-500 border-blue-600 ring-blue-300"
                  : "bg-purple-500 border-purple-600 ring-purple-300";

              return (
                <div
                  key={ra.index}
                  ref={isActiveRA ? activeRowRef : null}
                  className={clsx(
                    "flex items-center p-2 rounded-lg border transition-all duration-200",
                    isActiveRA
                      ? "bg-slate-100 border-slate-400 shadow-sm"
                      : "bg-white border-gray-100 hover:border-gray-300",
                  )}
                >
                  <div className="w-6 text-center text-xs font-bold text-gray-500">
                    {ra.index}
                  </div>
                  <div
                    className={clsx(
                      "flex-1 text-sm font-medium truncate ml-2",
                      isActiveRA ? "text-slate-900" : "text-gray-700",
                    )}
                  >
                    {ra.name}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {columnsToShow.map((type) => {
                      const isTargetCell =
                        isActiveRA && activeDutyType === type;
                      const assignedVal = ra[type];
                      const isSource =
                        swapSource &&
                        swapSource.raIndex === ra.index &&
                        swapSource.dutyType === type;

                      return (
                        <div
                          key={type}
                          title={
                            assignedVal
                              ? getNiceDate(assignedVal)
                              : "Unassigned"
                          }
                          onClick={() => {
                            if (isSwapping && assignedVal) {
                              const parts = assignedVal.split("-");
                              const dStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
                              setSwapSource({
                                raIndex: ra.index,
                                dutyType: type,
                                date: dStr,
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
                                ? `${activeColor} text-white ring-2`
                                : assignedVal
                                  ? isSwapping
                                    ? "bg-green-500 hover:bg-indigo-400 cursor-pointer text-white border-green-600"
                                    : "bg-green-500 text-white border-green-600 cursor-help"
                                  : "bg-gray-50 text-gray-300 border-gray-200",
                          )}
                        >
                          {assignedVal ? "✓" : type.replace(/d|w/, "")}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
