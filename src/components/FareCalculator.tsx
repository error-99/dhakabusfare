import React, { useMemo } from "react";
import { Route, Stop } from "../types";
import { ArrowLeftRight, HelpCircle, Landmark, MapPin, Calculator, Ticket, ChevronRight, Hash } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getEnglishName } from "../utils/stationNames";

interface FareCalculatorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onSelectRoute: (route: Route) => void;
  fromStop: Stop | null;
  onSelectFromStop: (stop: Stop | null) => void;
  toStop: Stop | null;
  onSelectToStop: (stop: Stop | null) => void;
  onOpenReport?: () => void;
}

export default function FareCalculator({
  routes,
  selectedRoute,
  onSelectRoute,
  fromStop,
  onSelectFromStop,
  toStop,
  onSelectToStop,
  onOpenReport,
}: FareCalculatorProps) {
  // Swap stops for swift direction reversal
  const handleSwapStops = () => {
    const temp = fromStop;
    onSelectFromStop(toStop);
    onSelectToStop(temp);
  };

  // Perform fare computations in real-time
  const calculation = useMemo(() => {
    if (!selectedRoute || !fromStop || !toStop) return null;

    const dist = Math.abs(toStop.cumulative_km - fromStop.cumulative_km);
    const rawCost = dist * selectedRoute.fare_per_km;
    
    // If the origin and destination are identical, fare is free (0.0). Otherwise, minimum_fare applies.
    let finalFare = 0;
    if (dist > 0) {
      finalFare = Math.max(selectedRoute.minimum_fare, rawCost);
    }

    // Work out number of stops crossed on the route
    const stopsList = selectedRoute.stops;
    const fIdx = stopsList.findIndex((s) => s.stop_name === fromStop.stop_name);
    const tIdx = stopsList.findIndex((s) => s.stop_name === toStop.stop_name);
    let stopsCrossed = 0;
    if (fIdx !== -1 && tIdx !== -1) {
      stopsCrossed = Math.abs(tIdx - fIdx);
    }

    return {
      distance: dist,
      rawCost,
      finalFare,
      stopsCrossed,
      isMinApplied: rawCost > 0 && rawCost < selectedRoute.minimum_fare,
    };
  }, [selectedRoute, fromStop, toStop]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4" id="fare-counter-card">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-slate-50 text-indigo-600 rounded-xl border border-slate-100">
          <Calculator className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Fare Calculator & Ticket Booth
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Track distances and view live ticket pricing dynamically.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Route Dropdown Selection */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">
            Selected Route
          </label>
          <select
            value={selectedRoute?.route_id || ""}
            onChange={(e) => {
              const route = routes.find((r) => r.route_id === e.target.value);
              if (route) {
                onSelectRoute(route);
              }
            }}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-sans placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            id="route-select-dropdown"
          >
            <option value="" disabled className="text-slate-550">--- Choose route from loaded data ---</option>
            {routes.map((r) => (
              <option key={r.route_id} value={r.route_id} className="text-slate-800">
                [{r.route_id}] {r.route_name} ({r.stops.length} stops, {r.stops[r.stops.length - 1].cumulative_km} km)
              </option>
            ))}
          </select>
        </div>

        {/* Origin & Destination inputs */}
        <div className="grid grid-cols-1 md:grid-cols-9 items-center gap-3">
          {/* From Stop */}
          <div className="md:col-span-4">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">
              From (Origin)
            </label>
            <select
              value={fromStop?.stop_name || ""}
              onChange={(e) => {
                const stop = selectedRoute?.stops.find((s) => s.stop_name === e.target.value) || null;
                onSelectFromStop(stop);
              }}
              disabled={!selectedRoute}
              className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-405 border border-slate-200 text-slate-850 rounded-xl px-3 py-2.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              id="stop-from-dropdown"
            >
              <option value="" className="text-slate-400">-- Choose Origin --</option>
              {selectedRoute?.stops.map((stop) => (
                <option key={stop.stop_name} value={stop.stop_name} className="text-slate-800">
                  {stop.stop_name} ({getEnglishName(stop.stop_name)}) · {stop.cumulative_km.toFixed(1)} km
                </option>
              ))}
            </select>
          </div>

          {/* Swap Trigger */}
          <div className="md:col-span-1 flex justify-center pt-2">
            <button
              onClick={handleSwapStops}
              disabled={!fromStop && !toStop}
              className="p-1 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 transition-all hover:scale-105 text-slate-700"
              title="Reverse Direction"
              id="swap-stops-button"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 rotate-90 md:rotate-0" />
            </button>
          </div>

          {/* To Stop */}
          <div className="md:col-span-4">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">
              To (Destination)
            </label>
            <select
              value={toStop?.stop_name || ""}
              onChange={(e) => {
                const stop = selectedRoute?.stops.find((s) => s.stop_name === e.target.value) || null;
                onSelectToStop(stop);
              }}
              disabled={!selectedRoute}
              className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-405 border border-slate-200 text-slate-850 rounded-xl px-3 py-2.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              id="stop-to-dropdown"
            >
              <option value="" className="text-slate-400">-- Choose Destination --</option>
              {selectedRoute?.stops.map((stop) => (
                <option key={stop.stop_name} value={stop.stop_name} className="text-slate-800">
                  {stop.stop_name} ({getEnglishName(stop.stop_name)}) · {stop.cumulative_km.toFixed(1)} km
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ticket computation visualization */}
      <AnimatePresence mode="wait">
        {calculation ? (
          <motion.div
            key={selectedRoute?.route_id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="group/ticket bg-indigo-50/45 hover:bg-white border border-indigo-200 hover:border-indigo-400 rounded-xl p-4 space-y-4 shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* Visual Receipt ticket header */}
            <div className="flex border-b border-dashed border-indigo-200/80 pb-3 justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-indigo-900 text-xs tracking-wider font-sans">BUS FARE RECEIPT</span>
              </div>
              <div className="text-[10px] text-indigo-500 font-mono font-bold bg-indigo-100/50 px-1.5 py-0.2 rounded border border-indigo-100">
                #{selectedRoute?.route_id}-TICKET
              </div>
            </div>

            {/* Travel specifications */}
            <div className="text-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-sans shrink-0">From / Origin:</span>
                <span className="font-bold text-slate-900 break-words max-w-[70%] text-right flex flex-col items-end">
                  <span>{fromStop?.stop_name}</span>
                  <span className="text-[10px] text-slate-450 text-slate-400 font-mono font-medium">{fromStop ? getEnglishName(fromStop.stop_name) : ""}</span>
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-sans shrink-0">To / Destination:</span>
                <span className="font-bold text-slate-900 break-words max-w-[70%] text-right flex flex-col items-end">
                  <span>{toStop?.stop_name}</span>
                  <span className="text-[10px] text-slate-450 text-slate-400 font-mono font-medium">{toStop ? getEnglishName(toStop.stop_name) : ""}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Stops Crossed:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {calculation.stopsCrossed} {calculation.stopsCrossed === 1 ? "stop" : "stops"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Total Distance:</span>
                <span className="font-bold font-mono text-indigo-600 bg-indigo-100/40 px-1.5 rounded">
                  {calculation.distance.toFixed(1)} km
                </span>
              </div>
            </div>

            {/* Fare formula and pricing policy section */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-[11px] font-sans">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Applied Formula Breakdown</span>
              <div className="flex justify-between text-slate-600">
                <span>Calculated: {calculation.distance.toFixed(2)} km × ৳{selectedRoute?.fare_per_km.toFixed(2)}</span>
                <span>= ৳{calculation.rawCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Minimum Cap:</span>
                <span>= ৳{selectedRoute?.minimum_fare.toFixed(2)}</span>
              </div>

              {calculation.distance === 0 ? (
                <div className="p-1.5 mt-1.5 bg-amber-50 border border-amber-200/60 rounded-lg text-[10px] text-slate-700 font-sans">
                  ⚠️ Same place selected: Distance is zero, no fare calculated.
                </div>
              ) : calculation.isMinApplied ? (
                <div className="p-1.5 mt-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-800 font-sans">
                  💰 Minimum Fare Applied because raw cost (৳{calculation.rawCost.toFixed(2)}) is less than the minimum cap.
                </div>
              ) : (
                <div className="p-1.5 mt-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-sans">
                  ✅ Distance-based rate fully applies.
                </div>
              )}
            </div>

            {/* Total ticket amount */}
            <div className="pt-2 flex items-center justify-between border-t border-dashed border-indigo-200/80">
              <span className="text-slate-500 text-xs font-semibold">Total Cost:</span>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-indigo-600">
                  ৳{calculation.finalFare.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-400">including all local transport duties</p>
              </div>
            </div>

            {/* Dual verification and error annotation hotlinks positioned as a seamless edge-to-edge card footer */}
            <div className="-mx-4 -mb-4 mt-4 p-3 bg-slate-50 border-t border-indigo-150 flex items-center justify-between gap-3 rounded-b-xl">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenReport) onOpenReport();
                }}
                className="flex-1 py-2 px-2.5 bg-white hover:bg-rose-50/50 text-slate-700 hover:text-rose-600 font-bold text-[11px] rounded-lg border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                id="ticket-report-left"
              >
                <span>⚠️ Add Report</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenReport) onOpenReport();
                }}
                className="flex-1 py-2 px-2.5 bg-white hover:bg-rose-50/50 text-slate-700 hover:text-rose-600 font-bold text-[11px] rounded-lg border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-right shadow-2xs"
                id="ticket-report-right"
              >
                <span>Add Report ⚠️</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Ticket className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-600 font-medium font-sans">Please select Origin & Destination stops above</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Or click on quick popular links or the stations sequence panel.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
