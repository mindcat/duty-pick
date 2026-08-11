import React, { useState, useEffect } from "react";
import RosterPane from "./components/RosterPane";
import CalendarPane from "./components/CalendarPane";

export default function App() {
  const initParams = new URLSearchParams(window.location.search);
  const [draftOrder, setDraftOrder] = useState(
    () => initParams.get("order") || "wraparound",
  );
  const [startDateStr, setStartDateStr] = useState(
    () => initParams.get("start") || "2024-08-01",
  );
  const [endDateStr, setEndDateStr] = useState(
    () => initParams.get("end") || "2024-12-15",
  );
  const [excludedDates, setExcludedDates] = useState(() =>
    initParams.get("excluded") ? initParams.get("excluded").split(",") : [],
  );
  const [switchedDates, setSwitchedDates] = useState(() =>
    initParams.get("switched") ? initParams.get("switched").split(",") : [],
  );

  const [roster, setRoster] = useState(() => {
    const saved = localStorage.getItem("dutyRoster");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeRAIndex, setActiveRAIndex] = useState(
    () => parseInt(localStorage.getItem("activeRAIndex")) || null,
  );
  const [activeDutyType, setActiveDutyType] = useState(
    () => localStorage.getItem("activeDutyType") || null,
  );
  const [dutyMode, setDutyMode] = useState(
    () => localStorage.getItem("dutyMode") || "weekends",
  );
  const [isPicking, setIsPicking] = useState(
    () => localStorage.getItem("isPicking") === "true",
  );
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSource, setSwapSource] = useState(null);

  const [showRecentQRs, setShowRecentQRs] = useState(false);
  const [showTextQR, setShowTextQR] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true",
  );

  const [recentPicks, setRecentPicks] = useState([]);
  const [pickHistory, setPickHistory] = useState([]);

  useEffect(() => {
    localStorage.setItem("dutyRoster", JSON.stringify(roster));
  }, [roster]);
  useEffect(() => {
    localStorage.setItem("darkMode", isDarkMode);
  }, [isDarkMode]);
  useEffect(() => {
    if (activeRAIndex) localStorage.setItem("activeRAIndex", activeRAIndex);
    if (activeDutyType) localStorage.setItem("activeDutyType", activeDutyType);
  }, [activeRAIndex, activeDutyType]);
  useEffect(() => {
    localStorage.setItem("dutyMode", dutyMode);
    localStorage.setItem("isPicking", isPicking);
  }, [dutyMode, isPicking]);

  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set("order", draftOrder);
    url.searchParams.set("start", startDateStr);
    url.searchParams.set("end", endDateStr);
    if (excludedDates.length > 0)
      url.searchParams.set("excluded", excludedDates.join(","));
    else url.searchParams.delete("excluded");

    if (switchedDates.length > 0)
      url.searchParams.set("switched", switchedDates.join(","));
    else url.searchParams.delete("switched");

    window.history.replaceState({}, "", url);
  }, [startDateStr, endDateStr, excludedDates, switchedDates, draftOrder]);

  const activeRA = roster.find((r) => r.index === activeRAIndex);
  const columns =
    dutyMode === "weekdays"
      ? ["d1", "d2", "d3", "d4", "d5", "d6"]
      : ["w1", "w2", "w3"];
  const currentColumnIndex = columns.indexOf(activeDutyType);

  const getAdjacentSnakeNode = (direction) => {
    if (!activeRA || currentColumnIndex === -1) return null;
    let calcNextIndex = activeRAIndex;
    let calcNextColumnIndex = currentColumnIndex;

    if (draftOrder === "wraparound") {
      if (direction === "forward") {
        if (calcNextIndex < roster.length) calcNextIndex++;
        else {
          calcNextIndex = 1;
          calcNextColumnIndex++;
        }
      } else {
        if (calcNextIndex > 1) calcNextIndex--;
        else {
          calcNextIndex = roster.length;
          calcNextColumnIndex--;
        }
      }
    } else {
      const isMovingDown = currentColumnIndex % 2 === 0;
      if (direction === "forward") {
        if (isMovingDown) {
          if (calcNextIndex < roster.length) calcNextIndex++;
          else calcNextColumnIndex++;
        } else {
          if (calcNextIndex > 1) calcNextIndex--;
          else calcNextColumnIndex++;
        }
      } else {
        if (isMovingDown) {
          if (calcNextIndex > 1) calcNextIndex--;
          else calcNextColumnIndex--;
        } else {
          if (calcNextIndex < roster.length) calcNextIndex++;
          else calcNextColumnIndex--;
        }
      }
    }

    if (calcNextColumnIndex < 0 || calcNextColumnIndex >= columns.length)
      return null;
    return { nextIndex: calcNextIndex, nextType: columns[calcNextColumnIndex] };
  };

  const nextNode = getAdjacentSnakeNode("forward");
  const nextRA = nextNode
    ? roster.find((r) => r.index === nextNode.nextIndex)
    : null;
  const nextDutyType = nextNode ? nextNode.nextType : null;

  const handleSelectDuty = (dateStr, slotNum) => {
    if (!isPicking || !activeRA || !activeDutyType) return;

    const hasDutyOnDate = [
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
      "d6",
      "w1",
      "w2",
      "w3",
    ].some((k) => activeRA[k] && activeRA[k].startsWith(dateStr));
    if (hasDutyOnDate) {
      alert(
        `${activeRA.name} already has a duty on ${dateStr}. RAs cannot have both slots on the same day.`,
      );
      return;
    }

    const assignmentString = `${dateStr}-${slotNum}`;
    const pickId = Date.now();
    setPickHistory((prev) => [
      {
        raIndex: activeRAIndex,
        dutyType: activeDutyType,
        dateStr,
        slotNum,
        pickId,
      },
      ...prev,
    ]);
    setRoster(
      roster.map((ra) =>
        ra.index === activeRAIndex
          ? { ...ra, [activeDutyType]: assignmentString }
          : ra,
      ),
    );
    setRecentPicks((prev) =>
      [
        { id: pickId, ra: activeRA, dutyType: activeDutyType, dateStr },
        ...prev,
      ].slice(0, 10),
    );

    if (nextNode) {
      setActiveRAIndex(nextNode.nextIndex);
      setActiveDutyType(nextNode.nextType);
    } else setIsPicking(false);
  };

  const handleUndo = () => {
    if (pickHistory.length === 0) return;
    const lastPick = pickHistory[0];
    setRoster((prev) =>
      prev.map((ra) =>
        ra.index === lastPick.raIndex
          ? { ...ra, [lastPick.dutyType]: null }
          : ra,
      ),
    );
    setActiveRAIndex(lastPick.raIndex);
    setActiveDutyType(lastPick.dutyType);
    setPickHistory((prev) => prev.slice(1));
    setRecentPicks((prev) => prev.filter((p) => p.id !== lastPick.pickId));
    setIsPicking(true);

    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 1000);
  };

  const handleClear = (dateStr, slotNum, ownerRAIndex, dutyType) => {
    setRoster((prev) =>
      prev.map((ra) =>
        ra.index === ownerRAIndex ? { ...ra, [dutyType]: null } : ra,
      ),
    );
    setRecentPicks((prev) =>
      prev.filter(
        (p) => !(p.ra.index === ownerRAIndex && p.dutyType === dutyType),
      ),
    );
  };

  const handleSwap = (targetDate, targetSlot, targetOwner) => {
    if (!swapSource) return;
    const confirmSwap = window.confirm(
      `Are you sure you want to make this swap?\n\nMoving: ${swapSource.currentOwnerName} (${swapSource.dutyType})\nFrom Date: ${swapSource.date} (Slot ${swapSource.slot})\nTo Date: ${targetDate} (Slot ${targetSlot})\nReplacing: ${targetOwner ? targetOwner.name : "Empty Slot"}`,
    );
    if (!confirmSwap) return;

    const targetValue = `${targetDate}-${targetSlot}`;
    const sourceValue = `${swapSource.date}-${swapSource.slot}`;

    setRoster(
      roster.map((ra) => {
        let newRA = { ...ra };
        if (ra.index === swapSource.raIndex)
          newRA[swapSource.dutyType] = targetValue;
        if (targetOwner && ra.index === targetOwner.index) {
          const key = Object.keys(ra).find((k) => ra[k] === targetValue);
          if (key) newRA[key] = sourceValue;
        }
        return newRA;
      }),
    );
    setSwapSource(null);
  };

  const handleExcludeDone = () => {
    setRoster(
      roster.map((ra) => {
        let newRa = { ...ra };
        ["d1", "d2", "d3", "d4", "d5", "d6", "w1", "w2", "w3"].forEach((k) => {
          if (newRa[k]) {
            const datePart = newRa[k].slice(0, 10);
            if (excludedDates.includes(datePart)) newRa[k] = null;
          }
        });
        return newRa;
      }),
    );
  };

  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (isPicking && !isSwapping) {
        if (e.key === "ArrowRight" && nextNode) {
          setActiveRAIndex(nextNode.nextIndex);
          setActiveDutyType(nextNode.nextType);
        } else if (e.key === "ArrowLeft") {
          const prevNode = getAdjacentSnakeNode("backward");
          if (prevNode) {
            setActiveRAIndex(prevNode.nextIndex);
            setActiveDutyType(prevNode.nextType);
          }
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [
    isPicking,
    isSwapping,
    activeRAIndex,
    activeDutyType,
    dutyMode,
    draftOrder,
    roster.length,
    pickHistory,
  ]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden relative transition-colors duration-200 ${isDarkMode ? "bg-slate-950 text-slate-200" : "bg-gray-100 text-slate-800"}`}
    >
      <style>{`
        @keyframes fadeOutUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 70% { opacity: 1; transform: translateY(-5px) scale(1.02); } 100% { opacity: 0; transform: translateY(-15px) scale(1.05); } }
        .animate-fade-out-up { animation: fadeOutUp 1s ease-out forwards; }
      `}</style>

      {showUndoToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/90 text-white text-4xl font-black px-12 py-8 rounded-3xl shadow-2xl tracking-widest animate-fade-out-up border-4 border-slate-700">
            UNDO SUCCESSFUL
          </div>
        </div>
      )}

      <div
        className={`w-full text-white py-3 px-6 shadow-md z-10 min-h-[56px] flex items-center justify-between transition-colors ${isSwapping ? "bg-indigo-900" : isDarkMode ? "bg-slate-900 border-b border-slate-700" : "bg-slate-900"}`}
      >
        {isSwapping ? (
          <div className="flex items-center gap-4 w-full justify-center">
            <span className="font-bold text-yellow-400 tracking-wider animate-pulse">
              SWAP MODE ACTIVE
            </span>
            <span className="text-indigo-200 text-sm">
              {!swapSource
                ? "STEP 1: Click a checkmark in the list to select a duty to move."
                : `STEP 2: Select a new date on the calendar for ${swapSource.currentOwnerName}.`}
            </span>
          </div>
        ) : isPicking && activeRA ? (
          <>
            <div className="text-sm font-semibold tracking-wide flex items-center">
              <span className="text-gray-400 mr-2">PICKING:</span>
              <span className="text-green-400 text-lg uppercase font-bold">
                {activeRA.name}
              </span>
              <span className="ml-3 px-2 py-0.5 bg-slate-700 rounded text-yellow-300">
                {activeDutyType?.toUpperCase()}
              </span>
            </div>
            {nextRA ? (
              <div className="text-sm font-semibold tracking-wide flex items-center">
                <span className="text-gray-400 mr-2">NEXT:</span>
                <span className="text-white text-md uppercase opacity-90">
                  {nextRA.name}
                </span>
                <span className="ml-3 px-2 py-0.5 bg-slate-800 rounded text-gray-300 border border-slate-600">
                  {nextDutyType?.toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="text-yellow-400 font-bold tracking-widest text-sm">
                FINAL PICK!
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-300 font-medium tracking-widest text-sm mx-auto">
            PICKING PAUSED — CONFIGURE ROSTER OR PRESS START
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`w-1/5 min-w-[340px] shadow-[4px_0_24px_rgba(0,0,0,0.05)] z-0 ${isDarkMode ? "bg-slate-900 border-r border-slate-800" : "bg-white"}`}
        >
          <RosterPane
            roster={roster}
            setRoster={setRoster}
            activeRAIndex={activeRAIndex}
            setActiveRAIndex={setActiveRAIndex}
            activeDutyType={activeDutyType}
            setActiveDutyType={setActiveDutyType}
            dutyMode={dutyMode}
            setDutyMode={setDutyMode}
            isPicking={isPicking}
            setIsPicking={setIsPicking}
            isSwapping={isSwapping}
            setIsSwapping={setIsSwapping}
            swapSource={swapSource}
            setSwapSource={setSwapSource}
            draftOrder={draftOrder}
            setDraftOrder={setDraftOrder}
            showRecentQRs={showRecentQRs}
            setShowRecentQRs={setShowRecentQRs}
            showTextQR={showTextQR}
            setShowTextQR={setShowTextQR}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        </div>

        <div
          className={`w-4/5 flex-1 flex flex-col overflow-hidden ${isDarkMode ? "bg-slate-950" : "bg-gray-50"}`}
        >
          <CalendarPane
            roster={roster}
            isPicking={isPicking}
            isSwapping={isSwapping}
            swapSource={swapSource}
            dutyMode={dutyMode}
            activeRAIndex={activeRAIndex}
            activeDutyType={activeDutyType}
            onSelectDuty={handleSelectDuty}
            onSwap={handleSwap}
            onClear={handleClear}
            startDateStr={startDateStr}
            setStartDateStr={setStartDateStr}
            endDateStr={endDateStr}
            setEndDateStr={setEndDateStr}
            excludedDates={excludedDates}
            setExcludedDates={setExcludedDates}
            switchedDates={switchedDates}
            setSwitchedDates={setSwitchedDates}
            onExcludeDone={handleExcludeDone}
            recentPicks={recentPicks}
            onUndo={handleUndo}
            canUndo={pickHistory.length > 0}
            showRecentQRs={showRecentQRs}
            showTextQR={showTextQR}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
