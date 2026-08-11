import React, { useState, useEffect, useRef } from "react";
import {
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  parseISO,
  isValid,
  getDaysInMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
} from "date-fns";
import clsx from "clsx";
import { QRCodeSVG } from "qrcode.react";
import Papa from "papaparse";
import { Calendar as CalendarIcon } from "lucide-react"; // <-- Replaced Settings Icon

export default function CalendarPane({
  roster,
  isPicking,
  isSwapping,
  swapSource,
  dutyMode,
  activeRAIndex,
  onSelectDuty,
  onSwap,
  onClear,
  startDateStr,
  setStartDateStr,
  endDateStr,
  setEndDateStr,
  excludedDates,
  setExcludedDates,
  switchedDates,
  setSwitchedDates,
  onExcludeDone,
  recentPicks,
  onUndo,
  canUndo,
  showRecentQRs,
  showTextQR,
  isDarkMode,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [keyBuffer, setKeyBuffer] = useState("");
  const [shortcutError, setShortcutError] = useState(false);

  const bufferRef = useRef("");
  const timerRef = useRef(null);
  const settingsRef = useRef(null);

  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);
  const isValidRange =
    isValid(startDate) && isValid(endDate) && startDate <= endDate;

  const isFriSat = (dateObj) =>
    dateObj.getDay() === 5 || dateObj.getDay() === 6;

  const getSingleQRData = (pick) => {
    const { ra, dutyType, dateStr } = pick;
    const [y, m, d] = dateStr.split("-");
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    const nextDateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, "0")}${String(dateObj.getDate()).padStart(2, "0")}`;
    const formattedStart = `${y}${m}${d}`;
    const isWknd = dutyType.startsWith("w");

    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n";
    ics += `UID:${formattedStart}-${ra.index}@dutypick\n`;
    if (isWknd)
      ics += `DTSTART:${formattedStart}T163000\nDTEND:${nextDateStr}T163000\nSUMMARY:Weekend Duty\n`;
    else
      ics += `DTSTART:${formattedStart}T163000\nDTEND:${nextDateStr}T090000\nSUMMARY:Weekday Duty\nLOCATION:Gleason Service Desk\n`;
    ics += "END:VEVENT\nEND:VCALENDAR";
    return ics.replace(/\n/g, "\r\n");
  };

  const getTextQRData = () => {
    if (!activeRAIndex) return "";
    const ra = roster.find((r) => r.index === activeRAIndex);
    if (!ra) return "";
    const wkdys = [];
    const wknds = [];
    ["d1", "d2", "d3", "d4", "d5", "d6", "w1", "w2", "w3"].forEach((k) => {
      if (ra[k]) {
        const parts = ra[k].split("-");
        const str = `${parts[1]}/${parts[2]}`;
        if (k.startsWith("w")) wknds.push(str);
        else wkdys.push(str);
      }
    });
    wkdys.sort();
    wknds.sort();
    return `SMSTO:0:${ra.name} Duties:\nWknd: ${wknds.join(", ")}\nWkdy: ${wkdys.join(", ")}`;
  };

  const getSlotDetails = (dateStr, slotNum) => {
    const targetId = `${dateStr}-${slotNum}`;
    for (const ra of roster) {
      for (const key of [
        "d1",
        "d2",
        "d3",
        "d4",
        "d5",
        "d6",
        "w1",
        "w2",
        "w3",
      ]) {
        if (ra[key] === targetId) return { ra, dutyType: key };
      }
    }
    return null;
  };

  const toggleExclude = (dateStr) =>
    setExcludedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr],
    );
  const toggleSwitch = (dateStr) =>
    setSwitchedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr],
    );

  const handleExport = () => {
    if (!isValidRange) return;
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const csvData = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const s1 = getSlotDetails(dateStr, 1);
      const s2 = getSlotDetails(dateStr, 2);
      return {
        Date: format(day, "MM/dd"),
        "RA on Duty 1": s1 ? s1.ra.name : "Unassigned",
        "RA on Duty 2": s2 ? s2.ra.name : "Unassigned",
      };
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "duty_schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target))
        setShowSettings(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsRef]);

  useEffect(() => {
    if (
      !isPicking ||
      !isValidRange ||
      isSwapping ||
      isExcluding ||
      isSwitching ||
      isClearing
    )
      return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT") return;
      const key = e.key.toLowerCase();

      if (key === "escape") {
        bufferRef.current = "";
        setKeyBuffer("");
        return;
      }
      if (key === "backspace") {
        bufferRef.current = bufferRef.current.slice(0, -1);
        setKeyBuffer(bufferRef.current);
        return;
      }

      const execute = (buffer) => {
        const monthMap = {
          j: 0,
          f: 1,
          m: 2,
          p: 3,
          y: 4,
          u: 5,
          l: 6,
          a: 7,
          s: 8,
          o: 9,
          n: 10,
          d: 11,
        };
        const match = buffer.match(/^([a-z])(\d{1,2})$/);

        if (match) {
          const [, charCode, dayStr] = match;
          const targetMonthIndex = monthMap[charCode];

          if (targetMonthIndex !== undefined) {
            const monthsInView = eachMonthOfInterval({
              start: startDate,
              end: endDate,
            });
            const matchedMonthObj = monthsInView.find(
              (d) => d.getMonth() === targetMonthIndex,
            );

            if (matchedMonthObj) {
              const dayNum = parseInt(dayStr, 10);
              const maxDays = getDaysInMonth(matchedMonthObj);
              if (dayNum >= 1 && dayNum <= maxDays) {
                const fullDateStr = `${format(matchedMonthObj, "yyyy-MM")}-${dayStr.padStart(2, "0")}`;
                const dateObj = new Date(fullDateStr + "T00:00:00");

                let isWknd = isFriSat(dateObj);
                if (switchedDates.includes(fullDateStr)) isWknd = !isWknd;

                if (isBefore(dateObj, startDate) || isAfter(dateObj, endDate))
                  return false;

                if (
                  (dutyMode === "weekdays" && !isWknd) ||
                  (dutyMode === "weekends" && isWknd)
                ) {
                  if (!excludedDates.includes(fullDateStr)) {
                    const s1 = getSlotDetails(fullDateStr, 1);
                    const s2 = getSlotDetails(fullDateStr, 2);
                    if (!s1) {
                      onSelectDuty(fullDateStr, 1);
                      return true;
                    } else if (!s2) {
                      onSelectDuty(fullDateStr, 2);
                      return true;
                    }
                  }
                }
              }
            }
          }
        }
        return false;
      };

      const triggerError = () => {
        setShortcutError(true);
        bufferRef.current = "";
        setKeyBuffer("");
        setTimeout(() => setShortcutError(false), 3000);
      };

      if (key === "enter" || key === " ") {
        e.preventDefault();
        if (execute(bufferRef.current)) {
          bufferRef.current = "";
          setKeyBuffer("");
        } else triggerError();
      } else if (key.length === 1 && /[a-z0-9]/.test(key)) {
        bufferRef.current += key;
        setKeyBuffer(bufferRef.current);

        const match = bufferRef.current.match(/^([a-z])(\d{1,2})$/);
        let shouldAutoExecute = false;

        if (match) {
          const digits = match[2];
          if (digits.length === 2) shouldAutoExecute = true;
          else if (digits.length === 1) {
            const digitNum = parseInt(digits, 10);
            if (digitNum >= 4 && digitNum <= 9) shouldAutoExecute = true;
          }
        }

        if (shouldAutoExecute) {
          if (execute(bufferRef.current)) {
            bufferRef.current = "";
            setKeyBuffer("");
          } else triggerError();
        }

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = "";
          setKeyBuffer("");
        }, 3000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [
    isPicking,
    isSwapping,
    isExcluding,
    isSwitching,
    isClearing,
    dutyMode,
    startDate,
    endDate,
    excludedDates,
    switchedDates,
    roster,
    onSelectDuty,
  ]);

  const renderMonthTitle = (date) => {
    const name = format(date, "MMMM");
    const m = date.getMonth();
    const highlightIdx = {
      0: 0,
      1: 0,
      2: 0,
      3: 1,
      4: 2,
      5: 1,
      6: 2,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
    }[m];

    return (
      <span className="uppercase tracking-widest text-sm font-bold">
        {name.split("").map((char, i) => (
          <span
            key={i}
            className={
              i === highlightIdx ? "text-yellow-400 text-lg mx-[1px]" : ""
            }
          >
            {char}
          </span>
        ))}{" "}
        <span
          className={`text-[14px] ml-1 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
        >
          {format(date, "yyyy")}
        </span>
      </span>
    );
  };

  const months = isValidRange
    ? eachMonthOfInterval({ start: startDate, end: endDate })
    : [];

  const c_bg = isDarkMode ? "bg-slate-900" : "bg-white";
  const c_border = isDarkMode ? "border-slate-700" : "border-gray-200";

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {showTextQR && activeRAIndex && (
        <div className="absolute top-20 right-8 z-50 bg-white p-4 rounded-xl shadow-xl border border-gray-300 flex flex-col items-center">
          <div className="mb-2 text-[14px] font-bold text-slate-800 text-center uppercase tracking-wider">
            {roster.find((r) => r.index === activeRAIndex)?.name}'s Shifts
          </div>
          <QRCodeSVG value={getTextQRData()} size={150} level="M" />
          <div className="mt-2 text-xs text-gray-500 font-medium">
            Text list of all dates
          </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div
        className={`${c_bg} border-b ${c_border} p-4 flex justify-between items-center shadow-sm z-70 flex-shrink-0`}
      >
        <div className="flex gap-4 items-center">
          {/* SETTINGS DROPDOWN (Z-[100]) */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors border shadow-sm flex items-center justify-center ${isDarkMode ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"}`}
              title="Calendar Settings"
            >
              <CalendarIcon size={18} />
            </button>

            {showSettings && (
              <div
                className={`absolute top-full left-0 mt-2 p-4 rounded-xl shadow-2xl z-[100] flex flex-col gap-4 border w-max min-w-[420px] ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}
              >
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                  >
                    Duty Range
                  </span>
                  <div
                    className={`flex items-center gap-2 p-1.5 rounded border ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-100 border-gray-200"}`}
                  >
                    <input
                      type="date"
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className={`flex-1 min-w-0 text-xs px-1 py-1 rounded border outline-none ${isDarkMode ? "bg-slate-700 border-slate-500 text-white" : "bg-white border-gray-300"}`}
                    />
                    <span
                      className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                    >
                      to
                    </span>
                    <input
                      type="date"
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      className={`flex-1 min-w-0 text-xs px-1 py-1 rounded border outline-none ${isDarkMode ? "bg-slate-700 border-slate-500 text-white" : "bg-white border-gray-300"}`}
                    />
                  </div>
                </div>

                <div
                  className={`border-t ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
                ></div>

                {/* HORIZONTAL MODE BUTTONS */}
                <div className="flex flex-row gap-2 w-full">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      if (isSwitching) setIsSwitching(false);
                      if (isClearing) setIsClearing(false);
                      if (isExcluding) onExcludeDone();
                      setIsExcluding(!isExcluding);
                    }}
                    className={clsx(
                      "flex-1 px-3 py-2 text-[10px] font-bold uppercase rounded shadow-sm transition border",
                      isExcluding
                        ? "bg-red-600 text-white border-red-700"
                        : isDarkMode
                          ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                          : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100",
                    )}
                  >
                    Exclude Days
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      if (isExcluding) onExcludeDone();
                      setIsExcluding(false);
                      if (isClearing) setIsClearing(false);
                      setIsSwitching(!isSwitching);
                    }}
                    className={clsx(
                      "flex-1 px-3 py-2 text-[10px] font-bold uppercase rounded shadow-sm transition border",
                      isSwitching
                        ? "bg-purple-600 text-white border-purple-700"
                        : isDarkMode
                          ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                          : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100",
                    )}
                  >
                    Switch Wknd/Wkdy
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      if (isExcluding) onExcludeDone();
                      setIsExcluding(false);
                      setIsSwitching(false);
                      setIsClearing(!isClearing);
                    }}
                    className={clsx(
                      "flex-1 px-3 py-2 text-[10px] font-bold uppercase rounded shadow-sm transition border",
                      isClearing
                        ? "bg-orange-500 text-white border-orange-600"
                        : isDarkMode
                          ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                          : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100",
                    )}
                  >
                    Clear Duty
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DONE BUTTON FOR ACTIVE MODES */}
          {(isExcluding || isSwitching || isClearing) && (
            <button
              onClick={() => {
                if (isExcluding) onExcludeDone();
                setIsExcluding(false);
                setIsSwitching(false);
                setIsClearing(false);
              }}
              className="px-4 py-1.5 text-xs font-bold uppercase rounded shadow-md transition border bg-green-500 hover:bg-green-600 text-white border-green-700 animate-pulse"
            >
              Done{" "}
              {isExcluding
                ? "Excluding"
                : isSwitching
                  ? "Switching"
                  : "Clearing"}
            </button>
          )}

          <div
            className={`relative flex items-center gap-2 text-sm px-3 py-1.5 rounded border ${isDarkMode ? "bg-blue-900/30 border-blue-800" : "bg-blue-50 border-blue-100"}`}
          >
            <span
              className={`font-semibold ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}
            >
              Shortcut:
            </span>
            <span
              className={`font-mono px-2 py-0.5 border rounded min-w-[3rem] text-center inline-block ${isDarkMode ? "bg-slate-800 border-blue-700 text-blue-300" : "bg-white border-blue-200 text-blue-600"}`}
            >
              {keyBuffer || "-"}
            </span>
            {shortcutError && (
              <div className="absolute -bottom-8 left-0 w-full text-center text-xs font-bold text-red-500 animate-pulse">
                Not Available!
              </div>
            )}
          </div>

          <button
            onClick={onUndo}
            disabled={!canUndo || !isPicking}
            className={clsx(
              "px-3 py-1.5 text-xs font-bold uppercase rounded shadow-sm transition border",
              canUndo && isPicking
                ? "bg-orange-500 text-white border-orange-600 hover:bg-orange-600"
                : isDarkMode
                  ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed",
            )}
          >
            Undo Last
          </button>
        </div>

        {/* EXPORT CSV BUTTON */}
        <button
          onClick={handleExport}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase rounded shadow-sm transition"
        >
          Export CSV
        </button>
      </div>

      <div className="flex-1 p-4 relative flex flex-col min-h-0">
        {/* BLURRED LOCK SCREEN NOW Z-[60] */}
        {!isPicking &&
          !isSwapping &&
          !isExcluding &&
          !isSwitching &&
          !isClearing && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px] z-[60] flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900 px-8 py-6 rounded-2xl shadow-2xl border-2 border-slate-700 text-yellow-400 font-black tracking-widest text-xl">
                PRESS START TO UNLOCK
              </div>
            </div>
          )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar auto-rows-max pb-4">
          {months.map((month) => (
            <div
              key={month.toString()}
              className={`${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"} rounded-xl shadow-sm border overflow-hidden flex flex-col`}
            >
              <div className="bg-slate-900 text-white py-2 text-center select-none border-b border-slate-700">
                {renderMonthTitle(month)}
              </div>

              <div
                className={`grid grid-cols-7 border-b ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
              >
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div
                    key={i}
                    className={`text-center py-1 text-[14px] font-bold uppercase border-r last:border-r-0 ${isDarkMode ? "text-slate-400 border-slate-700" : "text-gray-500 border-gray-200"}`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(month), { weekStarts: 0 }),
                  end: endOfWeek(endOfMonth(month), { weekStarts: 0 }),
                }).map((day, idx) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isCurrentMonth = isSameMonth(day, month);
                  const outsideRange =
                    isBefore(day, startDate) || isAfter(day, endDate);
                  const isExcluded = excludedDates.includes(dateStr);

                  let isWknd = isFriSat(day);
                  if (switchedDates.includes(dateStr)) isWknd = !isWknd;

                  const isLockedOut =
                    (dutyMode === "weekdays" && isWknd) ||
                    (dutyMode === "weekends" && !isWknd) ||
                    outsideRange ||
                    isExcluded;

                  const d1 = getSlotDetails(dateStr, 1);
                  const d2 = getSlotDetails(dateStr, 2);

                  if (!isCurrentMonth)
                    return (
                      <div
                        key={idx}
                        className={`${isDarkMode ? "bg-slate-900/50 border-slate-700" : "bg-gray-50/50 border-gray-100"} border-r border-b aspect-square`}
                      />
                    );

                  const isOwner1 = d1?.ra.index === activeRAIndex;
                  const isOwner2 = d2?.ra.index === activeRAIndex;
                  const activeColor = isDarkMode
                    ? "fill-yellow-600"
                    : "fill-yellow-500";

                  return (
                    <div
                      key={dateStr}
                      className={clsx(
                        "relative aspect-square border-r border-b",
                        isDarkMode ? "border-slate-700" : "border-gray-200",
                        outsideRange
                          ? isDarkMode
                            ? "bg-slate-900"
                            : "bg-gray-100"
                          : isDarkMode
                            ? "bg-slate-800"
                            : "bg-white",
                      )}
                    >
                      <div
                        className={clsx(
                          "absolute top-0.5 left-1 z-[11] text-[20px] font-black pointer-events-none drop-shadow-md",
                          isWknd
                            ? isDarkMode
                              ? "text-purple-400"
                              : "text-purple-900"
                            : isDarkMode
                              ? "text-slate-300"
                              : "text-gray-800",
                        )}
                      >
                        {format(day, "d")}
                      </div>

                      {isExcluding && (
                        <div
                          className={clsx(
                            "absolute inset-0 z-30 cursor-pointer transition-colors",
                            isExcluded
                              ? "bg-red-500/20 hover:bg-red-500/10"
                              : "hover:bg-red-500/20",
                          )}
                          onClick={() => toggleExclude(dateStr)}
                        />
                      )}
                      {isSwitching && !outsideRange && (
                        <div
                          className={clsx(
                            "absolute inset-0 z-30 cursor-pointer transition-colors flex items-center justify-center",
                            switchedDates.includes(dateStr)
                              ? "bg-purple-500/20 hover:bg-purple-500/10"
                              : "hover:bg-purple-500/20",
                          )}
                          onClick={() => toggleSwitch(dateStr)}
                        >
                          {switchedDates.includes(dateStr) && (
                            <span className="text-[10px] font-bold bg-purple-600 text-white px-1 rounded pointer-events-none opacity-80">
                              SWITCHED
                            </span>
                          )}
                        </div>
                      )}

                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-full absolute inset-0 z-10"
                      >
                        <polygon
                          points="0,0 100,0 0,100"
                          onClick={() => {
                            if (isClearing) {
                              if (d1)
                                onClear(dateStr, 1, d1.ra.index, d1.dutyType);
                            } else if (isSwapping) {
                              onSwap(dateStr, 1, d1?.ra);
                            } else if (
                              !isLockedOut &&
                              !d1 &&
                              !isExcluding &&
                              !isSwitching
                            ) {
                              onSelectDuty(dateStr, 1);
                            }
                          }}
                          className={clsx(
                            "transition-colors stroke-[0.5]",
                            isDarkMode ? "stroke-slate-700" : "stroke-white",
                            isClearing && d1
                              ? "fill-green-400 hover:fill-red-500 cursor-pointer"
                              : isClearing && !d1
                                ? isLockedOut
                                  ? isDarkMode
                                    ? "fill-slate-900"
                                    : "fill-gray-100"
                                  : isDarkMode
                                    ? "fill-slate-800"
                                    : "fill-gray-50"
                                : isSwapping && swapSource
                                  ? "cursor-pointer hover:fill-indigo-400"
                                  : isLockedOut || isExcluding || isSwitching
                                    ? ""
                                    : "cursor-pointer",
                            !isClearing &&
                              (isLockedOut
                                ? isDarkMode
                                  ? "fill-slate-900"
                                  : "fill-gray-100"
                                : d1
                                  ? isOwner1
                                    ? activeColor
                                    : "fill-green-500"
                                  : isDarkMode
                                    ? "fill-slate-800 hover:fill-slate-600"
                                    : "fill-gray-50 hover:fill-blue-200"),
                          )}
                        >
                          <title>
                            {d1
                              ? `${d1.ra.name}`
                              : isLockedOut ||
                                  isExcluding ||
                                  isSwitching ||
                                  isClearing
                                ? "Locked"
                                : "Available"}
                          </title>
                        </polygon>

                        <polygon
                          points="100,100 0,100 100,0"
                          onClick={() => {
                            if (isClearing) {
                              if (d2)
                                onClear(dateStr, 2, d2.ra.index, d2.dutyType);
                            } else if (isSwapping) {
                              onSwap(dateStr, 2, d2?.ra);
                            } else if (
                              !isLockedOut &&
                              !d2 &&
                              !isExcluding &&
                              !isSwitching
                            ) {
                              onSelectDuty(dateStr, 2);
                            }
                          }}
                          className={clsx(
                            "transition-colors stroke-[0.5]",
                            isDarkMode ? "stroke-slate-700" : "stroke-white",
                            isClearing && d2
                              ? "fill-green-500 hover:fill-red-500 cursor-pointer"
                              : isClearing && !d2
                                ? isLockedOut
                                  ? isDarkMode
                                    ? "fill-slate-950"
                                    : "fill-gray-200"
                                  : isDarkMode
                                    ? "fill-slate-800"
                                    : "fill-gray-100"
                                : isSwapping && swapSource
                                  ? "cursor-pointer hover:fill-indigo-400"
                                  : isLockedOut || isExcluding || isSwitching
                                    ? ""
                                    : "cursor-pointer",
                            !isClearing &&
                              (isLockedOut
                                ? isDarkMode
                                  ? "fill-slate-950"
                                  : "fill-gray-200"
                                : d2
                                  ? isOwner2
                                    ? activeColor
                                    : "fill-green-600"
                                  : isDarkMode
                                    ? "fill-slate-800 hover:fill-slate-600"
                                    : "fill-gray-100 hover:fill-blue-300"),
                          )}
                        >
                          <title>
                            {d2
                              ? `${d2.ra.name}`
                              : isLockedOut ||
                                  isExcluding ||
                                  isSwitching ||
                                  isClearing
                                ? "Locked"
                                : "Available"}
                          </title>
                        </polygon>

                        <line
                          x1="0"
                          y1="100"
                          x2="100"
                          y2="0"
                          strokeWidth="1"
                          className={clsx(
                            "pointer-events-none",
                            isDarkMode ? "stroke-slate-700" : "stroke-white",
                          )}
                        />
                      </svg>

                      {(isLockedOut || outsideRange) && (
                        <div
                          className="absolute inset-0 z-20 pointer-events-none opacity-10"
                          style={{
                            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, ${isDarkMode ? "#fff" : "#000"} 3px, ${isDarkMode ? "#fff" : "#000"} 6px)`,
                          }}
                        ></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {recentPicks.length > 0 && showRecentQRs && (
        <div
          className={`h-72 border-t flex items-center px-6 gap-6 overflow-hidden flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-20 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-300"}`}
        >
          <div
            className={`text-[14px] font-bold uppercase tracking-widest transform -rotate-180 flex-shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
            style={{ writingMode: "vertical-rl" }}
          >
            Recent Picks
          </div>

          <div className="flex gap-6 overflow-x-hidden w-full h-full items-center">
            {recentPicks.map((pick) => (
              <div
                key={pick.id}
                className={`flex flex-col items-center justify-center border p-4 rounded-xl shadow-sm min-w-[220px] ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"}`}
              >
                <div
                  className={`text-sm font-black uppercase mb-3 text-center w-full truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
                >
                  {pick.ra.name}
                </div>
                <QRCodeSVG value={getSingleQRData(pick)} size={192} level="L" />
                <div
                  className={`text-xs font-bold mt-3 px-3 py-1 rounded ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-500"}`}
                >
                  {pick.dutyType.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
