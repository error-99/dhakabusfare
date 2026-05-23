import React, { useState, useEffect } from "react";
import { Route, Stop } from "../types";
import { Bus, MapPin, Navigation, Compass, ShieldAlert, Sparkles, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { getEnglishName } from "../utils/stationNames";

interface VisualRouteLineMapProps {
  route: Route | null;
  fromStop: Stop | null;
  toStop: Stop | null;
  onSelectStop?: (stop: Stop, role: "from" | "to") => void;
}

export default function VisualRouteLineMap({
  route,
  fromStop,
  toStop,
  onSelectStop,
}: VisualRouteLineMapProps) {
  const [animatedStopIndex, setAnimatedStopIndex] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Reset simulation when route changes
    setAnimatedStopIndex(null);
    setIsSimulating(false);
  }, [route]);

  if (!route) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center space-y-2">
        <Compass className="w-8 h-8 text-slate-300 mx-auto animate-spin" style={{ animationDuration: "12s" }} />
        <p className="text-xs text-slate-500 font-sans">
          Select or search for a bus line to render the live transit map line.
        </p>
      </div>
    );
  }

  const stops = route.stops;
  
  // Find indices
  const fromIndex = fromStop ? stops.findIndex((s) => s.stop_name === fromStop.stop_name) : -1;
  const toIndex = toStop ? stops.findIndex((s) => s.stop_name === toStop.stop_name) : -1;

  const isReverse = fromIndex > toIndex && fromIndex !== -1 && toIndex !== -1;
  const startIndex = isReverse ? toIndex : fromIndex;
  const endIndex = isReverse ? fromIndex : toIndex;

  // Simulate bus movement
  const startSimulation = () => {
    if (isSimulating || stops.length === 0) return;
    setIsSimulating(true);

    const startIdx = fromIndex !== -1 ? fromIndex : 0;
    const endIdx = toIndex !== -1 ? toIndex : stops.length - 1;

    let current = startIdx;
    setAnimatedStopIndex(current);

    const interval = setInterval(() => {
      if (startIdx <= endIdx) {
        if (current < endIdx) {
          current++;
          setAnimatedStopIndex(current);
        } else {
          clearInterval(interval);
          setIsSimulating(false);
        }
      } else {
        if (current > endIdx) {
          current--;
          setAnimatedStopIndex(current);
        } else {
          clearInterval(interval);
          setIsSimulating(false);
        }
      }
    }, 850);
  };

  // Scroll active simulated bus node into center viewport seamlessly
  useEffect(() => {
    if (animatedStopIndex !== null) {
      const activeElement = document.getElementById(`sim-stop-${animatedStopIndex}`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [animatedStopIndex]);

  // Compute total width based on stop counts to prevent label overlaps
  const minWidth = Math.max(720, stops.length * 115);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5" id="visual-map-card">
      {/* Header and Route metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-mono font-black rounded-lg uppercase tracking-wider shrink-0">
                Line {route.route_id}
              </span>
              <h3 className="text-xs font-black text-slate-900 truncate">
                {route.route_name}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
              Interactive Bus Corridor Schematic · {stops.length} stations • {stops[stops.length - 1].cumulative_km.toFixed(1)} km
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={startSimulation}
          disabled={isSimulating}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${
            isSimulating
              ? "bg-amber-100 text-amber-800 cursor-not-allowed"
              : "bg-indigo-50 hover:bg-indigo-150 border border-indigo-200/50 text-indigo-700"
          }`}
        >
          <Bus className={`w-3.5 h-3.5 ${isSimulating ? "animate-bounce" : ""}`} />
          {isSimulating ? "Simulating Ride..." : "Simulate Trip Ride"}
        </button>
      </div>

      {/* Main Schematic Diagram - Horizontal scroll for wide route paths */}
      <div className="relative w-full overflow-x-auto py-6 px-4 bg-slate-50/40 rounded-xl border border-slate-100 scrollbar-thin">
        <div 
          className="relative flex items-start justify-between py-2"
          style={{ minWidth: `${minWidth}px` }}
        >
          
          {/* Main absolute line of the route map - centered on the 24px station button height */}
          <div className="absolute left-0 right-0 h-1.5 bg-slate-200 rounded-full top-[12px] -translate-y-[50%] z-0" />

          {/* Highlighted section of the route map */}
          {fromIndex !== -1 && toIndex !== -1 && (
            <div
              className={`absolute h-1.5 rounded-full top-[12px] -translate-y-[50%] z-10 transition-all duration-500 ${
                isReverse 
                  ? "bg-gradient-to-r from-indigo-500 to-emerald-500" 
                  : "bg-gradient-to-r from-emerald-500 to-indigo-500"
              }`}
              style={{
                left: `${(startIndex / (stops.length - 1)) * 100}%`,
                right: `${100 - (endIndex / (stops.length - 1)) * 100}%`,
              }}
            />
          )}

          {/* Stops along the map */}
          {stops.map((stop, idx) => {
            const isOrigin = fromStop?.stop_name === stop.stop_name;
            const isTerminal = toStop?.stop_name === stop.stop_name;
            const isHighlighted =
              fromIndex !== -1 &&
              toIndex !== -1 &&
              idx >= startIndex &&
              idx <= endIndex;
            
            const isBusHere = isSimulating ? animatedStopIndex === idx : isOrigin;

            return (
              <div
                key={`${stop.stop_name}-${idx}`}
                id={`sim-stop-${idx}`}
                className="relative flex flex-col items-center z-20"
                style={{ width: `${100 / stops.length}%` }}
              >
                {/* Station bubble node */}
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectStop) {
                      // Click cycle: if fromStop is empty or clicked node isn't fromStop, set as fromStop
                      if (!fromStop || isTerminal) {
                        onSelectStop(stop, "from");
                      } else {
                        onSelectStop(stop, "to");
                      }
                    }
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all relative shrink-0 ${
                    isBusHere
                      ? "bg-amber-500 text-white scale-125 border-amber-600 ring-4 ring-amber-100"
                      : isOrigin
                      ? "bg-emerald-600 text-white scale-125 border-emerald-700 ring-4 ring-emerald-100 font-bold"
                      : isTerminal
                      ? "bg-indigo-600 text-white scale-125 border-indigo-700 ring-4 ring-indigo-100 font-bold"
                      : isHighlighted
                      ? "bg-white text-indigo-700 border-indigo-400 scale-105"
                      : "bg-white text-slate-400 hover:text-slate-700 border-slate-300 hover:scale-105 cursor-pointer"
                  }`}
                  title={`${stop.stop_name} (${getEnglishName(stop.stop_name)})`}
                >
                  {isBusHere ? (
                    <Bus className="w-3 h-3 animate-pulse" />
                  ) : isOrigin ? (
                    <span className="text-[9px] font-sans">A</span>
                  ) : isTerminal ? (
                    <span className="text-[9px] font-sans">B</span>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${isHighlighted ? "bg-indigo-500" : "bg-slate-400"}`} />
                  )}
                </button>

                {/* Station Label & Details (Using natural flow to prevent clipping) */}
                <div className="mt-4 text-center w-28 flex flex-col items-center shrink-0">
                  <span className={`text-[10px] font-black truncate max-w-full font-sans ${
                    isOrigin ? "text-emerald-700" : isTerminal ? "text-indigo-700" : "text-slate-800"
                  }`}>
                    {stop.stop_name}
                  </span>
                  
                  <span className="text-[8.5px] text-slate-400 font-mono font-medium truncate max-w-full">
                    {getEnglishName(stop.stop_name)}
                  </span>

                  <span className="text-[8px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded-md border border-slate-200 mt-1">
                    {stop.cumulative_km.toFixed(1)} km
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10.5px] text-slate-500 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 font-sans">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-700 font-bold flex items-center justify-center text-white text-[8px]">A</span>
            <span className="font-medium text-slate-700">Origin Stop</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 border border-indigo-700 font-bold flex items-center justify-center text-white text-[8px]">B</span>
            <span className="font-medium text-slate-700">Destination Stop</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500" />
            <span className="font-medium text-slate-700">Selected Path Segment</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-500 border border-amber-600 rounded-lg flex items-center justify-center text-white">
              <Bus className="w-2 h-2" />
            </div>
            <span className="font-medium text-slate-700">Subway Simulation Carrier</span>
          </div>
        </div>

        <div className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
          Route Scale: 1:1 Actual Cumulative Distance
        </div>
      </div>
    </div>
  );
}
