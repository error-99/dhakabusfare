import React, { useMemo } from "react";
import { Route, Stop } from "../types";
import { MapPin, Info, ArrowDown, HelpCircle, CheckCircle, Navigation } from "lucide-react";
import { motion } from "motion/react";
import { getEnglishName } from "../utils/stationNames";

interface RouteTimelineProps {
  route: Route | null;
  fromStop: Stop | null;
  toStop: Stop | null;
  onSelectStop: (stop: Stop, role: "from" | "to") => void;
}

export default function RouteTimeline({
  route,
  fromStop,
  toStop,
  onSelectStop,
}: RouteTimelineProps) {
  if (!route) {
    return (
      <div className="bg-white border border-dashed border-slate-250 rounded-2xl p-8 text-center shadow-sm" id="empty-timeline-card">
        <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2 border border-slate-100">
          <Navigation className="w-5 h-5 text-indigo-500" />
        </div>
        <p className="text-xs font-bold text-slate-800">No Route Selected</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto font-sans">
          Select or search for a bus route on the left panel to browse and calculate stops/fares.
        </p>
      </div>
    );
  }

  // Determine indices of selected stops to highlight the direct path segment
  const { fromIndex, toIndex, direction } = useMemo(() => {
    if (!fromStop || !toStop) return { fromIndex: -1, toIndex: -1, direction: "none" };
    
    const fIdx = route.stops.findIndex((s) => s.stop_name === fromStop.stop_name);
    const tIdx = route.stops.findIndex((s) => s.stop_name === toStop.stop_name);
    
    if (fIdx === -1 || tIdx === -1) return { fromIndex: -1, toIndex: -1, direction: "none" };
    
    return {
      fromIndex: fIdx,
      toIndex: tIdx,
      direction: fIdx <= tIdx ? "forward" : "backward",
    };
  }, [route, fromStop, toStop]);

  // Check if a stop index is part of the navigated path segment
  const isStopInSegment = (index: number) => {
    if (fromIndex === -1 || toIndex === -1) return false;
    if (direction === "forward") {
      return index >= fromIndex && index <= toIndex;
    } else {
      return index >= toIndex && index <= fromIndex;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4" id="route-timeline-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="min-w-0 pr-2">
          <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100 font-mono">
            Route ID: {route.route_id}
          </span>
          <h3 className="text-sm font-black text-slate-900 mt-1.5 font-sans truncate pr-2">
            {route.route_name}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
            Stops: <span className="font-bold text-slate-800">{route.stops.length}</span> · Total: <span className="font-bold text-slate-800">{route.stops[route.stops.length - 1].cumulative_km} km</span>
          </p>
        </div>

        <div className="text-right text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl font-mono shrink-0">
          <p className="text-[9px] text-slate-400 font-sans tracking-wide uppercase font-bold">Fare Rate</p>
          <p className="font-black text-indigo-600">৳{route.fare_per_km}/km</p>
          <p className="text-[10px] text-slate-500">Min: ৳{route.minimum_fare}</p>
        </div>
      </div>

      <div className="text-[11px] text-slate-600 p-2.5 bg-slate-50/50 rounded-xl flex items-start gap-1.5 border border-slate-100">
        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="font-sans text-slate-500 leading-relaxed">
          Tap <strong>Start From</strong> or <strong>Go To</strong> inside any stop module to configure your journey ticket.
        </p>
      </div>

      {/* Visual Timeline Section */}
      <div className="relative pl-6 space-y-5" id="timeline-scroll-area">
        {/* Connection rail/line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-1 bg-slate-100 rounded-full" />

        {/* Dynamic highlighted connection segment if path is active */}
        {fromIndex !== -1 && toIndex !== -1 && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            className="absolute bg-indigo-505 bg-indigo-550 rounded-full w-1 shadow-sm"
            style={{
              backgroundColor: "#4f46e5",
              left: "11px",
              top: `${(Math.min(fromIndex, toIndex) / (route.stops.length - 1)) * 94 + 2}%`,
              bottom: `${100 - ((Math.max(fromIndex, toIndex) / (route.stops.length - 1)) * 94 + 2.5)}%`,
            }}
          />
        )}

        {route.stops.map((stop, index) => {
          const isFrom = fromStop?.stop_name === stop.stop_name;
          const isTo = toStop?.stop_name === stop.stop_name;
          const isFirst = index === 0;
          const isLast = index === route.stops.length - 1;
          const inPathRange = isStopInSegment(index);

          // Get distance increment relative to previous stop
          const prevStop = index > 0 ? route.stops[index - 1] : null;
          const incDistance = prevStop ? (stop.cumulative_km - prevStop.cumulative_km) : 0;

          return (
            <div key={`${stop.stop_name}-${index}`} className="relative flex items-start justify-between gap-4 group">
              {/* Stop Indicator Bullet */}
              <div className="absolute -left-[20px] top-1.5 z-10 flex items-center justify-center">
                {isFrom ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-300 flex items-center justify-center"
                  />
                ) : isTo ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white ring-2 ring-rose-300 flex items-center justify-center"
                  />
                ) : (
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      inPathRange
                        ? "bg-indigo-600 border-indigo-400 ring-2 ring-indigo-100"
                        : "bg-white border-slate-300 group-hover:border-indigo-400"
                    }`}
                  />
                )}
              </div>

              {/* Stop details container */}
              <div className="flex-1 min-w-0 bg-slate-50/40 rounded-xl p-2.5 hover:bg-slate-50 hover:border-slate-200 border border-slate-100 transition-all font-sans">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-800 break-words">
                        {stop.stop_name}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono font-medium tracking-wide">
                        {getEnglishName(stop.stop_name)}
                      </span>
                    </div>

                    {isFirst && (
                      <span className="px-1.5 py-0.2 text-[8px] font-bold bg-emerald-50 text-emerald-600 rounded border border-emerald-100 shrink-0 self-start mt-0.5">
                        Origin
                      </span>
                    )}
                    {isLast && (
                      <span className="px-1.5 py-0.2 text-[8px] font-bold bg-amber-50 text-amber-600 rounded border border-amber-100 shrink-0 self-start mt-0.5">
                        Terminal
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0 font-bold">
                    {stop.cumulative_km.toFixed(1)} km
                  </span>
                </div>

                {index > 0 && (
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                    +{incDistance.toFixed(1)} km from preceding landmark
                  </span>
                )}

                {/* Micro Action Buttons */}
                <div className="mt-2 flex items-center gap-2 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => onSelectStop(stop, "from")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border font-sans cursor-pointer transition-transform ${
                      isFrom
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-white text-slate-700 hover:text-emerald-600 hover:border-emerald-300 border-slate-200"
                    }`}
                  >
                    Start From
                  </button>
                  <button
                    onClick={() => onSelectStop(stop, "to")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border font-sans cursor-pointer transition-transform ${
                      isTo
                        ? "bg-rose-605 bg-rose-600 text-white border-rose-500 shadow-sm"
                        : "bg-white text-slate-700 hover:text-rose-600 hover:border-rose-300 border-slate-200"
                    }`}
                  >
                    Go To
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
