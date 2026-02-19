import React, { useState, useEffect } from "react";
import RosterPane from "./components/RosterPane";
import CalendarPane from "./components/CalendarPane";

export default function App() {
  // --- GLOBAL STATE ---
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
    () => localStorage.getItem("dutyMode") || "weekdays",
  );
  const [isPicking, setIsPicking] = useState(
    () => localStorage.getItem("isPicking") === "true",
  );

  // swap state handlers
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSource, setSwapSource] = useState(null);

  // caching because i know some rc is gonna try and reload a page when they shouldn't
  useEffect(() => {
    localStorage.setItem("dutyRoster", JSON.stringify(roster));
  }, [roster]);
  useEffect(() => {
    if (activeRAIndex) localStorage.setItem("activeRAIndex", activeRAIndex);
    if (activeDutyType) localStorage.setItem("activeDutyType", activeDutyType);
  }, [activeRAIndex, activeDutyType]);
  useEffect(() => {
    localStorage.setItem("dutyMode", dutyMode);
    localStorage.setItem("isPicking", isPicking);
  }, [dutyMode, isPicking]);

  // snaking happens automatically
  const activeRA = roster.find((r) => r.index === activeRAIndex);
  const columns =
    dutyMode === "weekdays" ? ["d1", "d2", "d3", "d4", "d5"] : ["w1", "w2"];
  const currentColumnIndex = columns.indexOf(activeDutyType);

  const getAdjacentSnakeNode = (direction) => {
    if (!activeRA || currentColumnIndex === -1) return null;
    let calcNextIndex = activeRAIndex;
    let calcNextColumnIndex = currentColumnIndex;
    const isMovingDown = currentColumnIndex % 2 === 0;

    if (direction === "forward") {
      if (isMovingDown) {
        if (calcNextIndex < roster.length) calcNextIndex++;
        else calcNextColumnIndex++;
      } else {
        if (calcNextIndex > 1) calcNextIndex--;
        else calcNextColumnIndex++;
      }
    } else if (direction === "backward") {
      if (isMovingDown) {
        if (calcNextIndex > 1) calcNextIndex--;
        else calcNextColumnIndex--;
      } else {
        if (calcNextIndex < roster.length) calcNextIndex++;
        else calcNextColumnIndex--;
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

  // pick
  const handleSelectDuty = (dateStr, slotNum) => {
    if (!isPicking || !activeRA || !activeDutyType) return;

    const assignmentString = `${dateStr}-${slotNum}`;
    const updatedRoster = roster.map((ra) =>
      ra.index === activeRAIndex
        ? { ...ra, [activeDutyType]: assignmentString }
        : ra,
    );
    setRoster(updatedRoster);

    if (nextNode) {
      setActiveRAIndex(nextNode.nextIndex);
      setActiveDutyType(nextNode.nextType);
    } else {
      setIsPicking(false);
    }
  };

  // swap
  const handleSwap = (targetDate, targetSlot, targetOwner) => {
    if (!swapSource) return;

    const targetValue = `${targetDate}-${targetSlot}`;
    const sourceValue = `${swapSource.date}-${swapSource.slot}`;

    const updatedRoster = roster.map((ra) => {
      let newRA = { ...ra };

      if (ra.index === swapSource.raIndex) {
        newRA[swapSource.dutyType] = targetValue;
      }

      if (targetOwner && ra.index === targetOwner.index) {
        const key = Object.keys(ra).find((k) => ra[k] === targetValue);
        if (key) newRA[key] = sourceValue;
      }

      return newRA;
    });

    setRoster(updatedRoster);
    setSwapSource(null); // reset
  };

  // <- and ->
  useEffect(() => {
    if (!isPicking || isSwapping) return; // Disable arrows during swap mode

    const handleArrows = (e) => {
      if (e.target.tagName === "INPUT") return;
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
    };
    window.addEventListener("keydown", handleArrows);
    return () => window.removeEventListener("keydown", handleArrows);
  }, [
    isPicking,
    isSwapping,
    activeRAIndex,
    activeDutyType,
    dutyMode,
    roster.length,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* notif banner */}
      <div
        className={`w-full text-white py-3 px-6 shadow-md z-10 min-h-[56px] flex items-center justify-between transition-colors ${isSwapping ? "bg-indigo-900" : "bg-slate-900"}`}
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
        <div className="w-1/4 min-w-[380px] shadow-[4px_0_24px_rgba(0,0,0,0.05)] z-0 bg-white">
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
          />
        </div>
        <div className="w-3/4 flex-1 flex flex-col bg-gray-50 overflow-hidden">
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
          />
        </div>
      </div>
    </div>
  );
}
