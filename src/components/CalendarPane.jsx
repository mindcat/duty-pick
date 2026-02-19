import React, { useState, useEffect, useRef } from "react";
import {
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isWeekend,
  parseISO,
  isValid,
  getDaysInMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
} from "date-fns";
import clsx from "clsx";
import { QRCodeSVG } from "qrcode.react";
import Papa from "papaparse"; // csv io

export default function CalendarPane({
  roster,
  isPicking,
  isSwapping,
  swapSource,
  dutyMode,
  activeRAIndex,
  onSelectDuty,
  onSwap,
}) {
  const [startDateStr, setStartDateStr] = useState("2024-08-01");
  const [endDateStr, setEndDateStr] = useState("2024-12-15");
  const [showQR, setShowQR] = useState(false);
  const [keyBuffer, setKeyBuffer] = useState("");

  const bufferRef = useRef("");
  const timerRef = useRef(null);

  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);
  const isValidRange =
    isValid(startDate) && isValid(endDate) && startDate <= endDate;

  // qr data
  const getActiveRAQRData = () => {
    if (!activeRAIndex) return "";
    const ra = roster.find((r) => r.index === activeRAIndex);
    if (!ra) return "";

    // Collect all dates
    const dates = [];
    ["d1", "d2", "d3", "d4", "d5", "w1", "w2", "w3"].forEach((k) => {
      if (ra[k]) {
        // ra[k] is "2024-10-24-1" -> split gives ["2024", "10", "24", "1"]
        const parts = ra[k].split("-");
        dates.push(`${parts[1]}/${parts[2]}`);
      }
    });

    dates.sort();
    return `SMSTO:0:${ra.name} is on duty: ${dates.join(", ")}`;
  };

  const getSlotDetails = (dateStr, slotNum) => {
    const targetId = `${dateStr}-${slotNum}`;
    for (const ra of roster) {
      for (const key of ["d1", "d2", "d3", "d4", "d5", "w1", "w2", "w3"]) {
        if (ra[key] === targetId) return { ra, dutyType: key };
      }
    }
    return null;
  };

  // csv export
  const handleExport = () => {
    if (!isValidRange) return;

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const csvData = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const s1 = getSlotDetails(dateStr, 1);
      const s2 = getSlotDetails(dateStr, 2);

      return {
        Date: dateStr,
        "RA on Duty 1": s1 ? s1.ra.name : "Unassigned",
        "RA on Duty 2": s2 ? s2.ra.name : "Unassigned",
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "duty_schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // keyboard shorcuts
  useEffect(() => {
    if (!isPicking || !isValidRange || isSwapping) return;

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
                const isWknd = isWeekend(dateObj);
                const isValidMode = dutyMode === "weekdays" ? !isWknd : isWknd;

                if (isBefore(dateObj, startDate) || isAfter(dateObj, endDate))
                  return false;

                if (isValidMode) {
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
        return false;
      };

      if (key === "enter") {
        if (execute(bufferRef.current)) {
          bufferRef.current = "";
          setKeyBuffer("");
        }
      } else if (key.length === 1 && /[a-z0-9]/.test(key)) {
        bufferRef.current += key;
        setKeyBuffer(bufferRef.current);
        if (bufferRef.current.length >= 3) {
          if (execute(bufferRef.current)) {
            bufferRef.current = "";
            setKeyBuffer("");
          }
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
    dutyMode,
    startDate,
    endDate,
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
        <span className="text-gray-400 text-xs ml-1">
          {format(date, "yyyy")}
        </span>
      </span>
    );
  };

  const months = isValidRange
    ? eachMonthOfInterval({ start: startDate, end: endDate })
    : [];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
      {/* qr at bottom right */}
      {showQR && isPicking && activeRAIndex && (
        <div className="absolute bottom-10 right-10 z-50 bg-white p-6 rounded-2xl shadow-2xl border-4 border-slate-800 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8">
          <QRCodeSVG value={getActiveRAQRData()} size={200} />
          <div className="mt-4 text-sm font-bold text-slate-800 text-center uppercase tracking-wider">
            Scan for {roster.find((r) => r.index === activeRAIndex)?.name}'s
            Shifts
          </div>
        </div>
      )}

      {/* toolbar */}
      <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded text-sm border border-gray-200">
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 bg-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-1.5 rounded border border-blue-100">
            <span className="font-semibold text-blue-700">Fast Pick:</span>
            <span className="font-mono bg-white px-2 py-0.5 border border-blue-200 rounded text-blue-600 min-w-[3rem] text-center inline-block">
              {keyBuffer || "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* export */}
          <button
            onClick={handleExport}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase rounded shadow-sm transition"
          >
            Export CSV
          </button>

          {/* qr toggle */}
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none border-l pl-4 border-gray-300">
            <input
              type="checkbox"
              checked={showQR}
              onChange={(e) => setShowQR(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            SHOW QR
          </label>
        </div>
      </div>

      {/* calendar grid */}
      <div className="flex-1 p-4 relative flex flex-col min-h-0">
        {!isPicking && !isSwapping && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-white px-8 py-6 rounded-2xl shadow-xl border border-gray-200 text-gray-700 font-black tracking-widest text-xl">
              PRESS START TO UNLOCK
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar content-start pb-20">
          {months.map((month) => (
            <div
              key={month.toString()}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-fit"
            >
              <div className="bg-slate-800 text-white py-2 text-center select-none">
                {renderMonthTitle(month)}
              </div>
              <div className="grid grid-cols-7 border-b border-gray-200">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div
                    key={i}
                    className="text-center py-1 text-[10px] font-bold text-gray-500 uppercase border-r last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(month), { weekStarts: 1 }),
                  end: endOfWeek(endOfMonth(month), { weekStarts: 1 }),
                }).map((day, idx) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isCurrentMonth = isSameMonth(day, month);
                  const isWknd = isWeekend(day);
                  const outsideRange =
                    isBefore(day, startDate) || isAfter(day, endDate);
                  const isLockedOut =
                    (dutyMode === "weekdays" && isWknd) ||
                    (dutyMode === "weekends" && !isWknd) ||
                    outsideRange;

                  const d1 = getSlotDetails(dateStr, 1);
                  const d2 = getSlotDetails(dateStr, 2);

                  if (!isCurrentMonth)
                    return (
                      <div
                        key={idx}
                        className="bg-gray-50/50 border-r border-b border-gray-100 aspect-square"
                      />
                    );

                  return (
                    <div
                      key={dateStr}
                      className={clsx(
                        "relative aspect-square border-r border-b border-gray-200",
                        outsideRange ? "bg-gray-100" : "bg-white",
                      )}
                    >
                      <div className="absolute top-0.5 left-1 z-10 text-[10px] font-bold text-gray-700 pointer-events-none opacity-80">
                        {format(day, "d")}
                      </div>

                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-full absolute inset-0"
                      >
                        {/* SLOT 1 */}
                        <polygon
                          points="0,0 100,0 0,100"
                          onClick={() => {
                            if (isSwapping) onSwap(dateStr, 1, d1?.ra);
                            else if (!isLockedOut && !d1)
                              onSelectDuty(dateStr, 1);
                          }}
                          className={clsx(
                            "transition-colors stroke-white stroke-[0.5]",
                            isSwapping && swapSource
                              ? "cursor-pointer hover:fill-indigo-300"
                              : isLockedOut
                                ? ""
                                : "cursor-pointer",
                            isLockedOut
                              ? "fill-gray-100"
                              : d1
                                ? "fill-green-400"
                                : "fill-gray-50 hover:fill-blue-200",
                          )}
                        >
                          <title>
                            {d1
                              ? `${d1.ra.name}`
                              : isLockedOut
                                ? "Locked"
                                : "Available"}
                          </title>
                        </polygon>

                        {/* SLOT 2 */}
                        <polygon
                          points="100,100 0,100 100,0"
                          onClick={() => {
                            if (isSwapping) onSwap(dateStr, 2, d2?.ra);
                            else if (!isLockedOut && !d2)
                              onSelectDuty(dateStr, 2);
                          }}
                          className={clsx(
                            "transition-colors stroke-white stroke-[0.5]",
                            isSwapping && swapSource
                              ? "cursor-pointer hover:fill-indigo-300"
                              : isLockedOut
                                ? ""
                                : "cursor-pointer",
                            isLockedOut
                              ? "fill-gray-200"
                              : d2
                                ? "fill-green-500"
                                : "fill-gray-100 hover:fill-blue-300",
                          )}
                        >
                          <title>
                            {d2
                              ? `${d2.ra.name}`
                              : isLockedOut
                                ? "Locked"
                                : "Available"}
                          </title>
                        </polygon>
                        <line
                          x1="0"
                          y1="100"
                          x2="100"
                          y2="0"
                          stroke="white"
                          strokeWidth="1"
                          className="pointer-events-none"
                        />
                      </svg>

                      {(isLockedOut || outsideRange) && (
                        <div
                          className="absolute inset-0 pointer-events-none opacity-10"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(45deg, transparent, transparent 3px, #000 3px, #000 6px)",
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
    </div>
  );
}
