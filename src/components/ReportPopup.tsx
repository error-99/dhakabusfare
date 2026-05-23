import React, { useState } from "react";
import { Route } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle, CheckCircle, ShieldAlert, ChevronDown, Check, CornerDownRight } from "lucide-react";

interface ReportPopupProps {
  isOpen: boolean;
  onClose: () => void;
  routes: Route[];
  selectedRouteId?: string;
}

const ERROR_CATEGORIES = [
  { value: "fare_mismatch", label: "Wrong Fare Calculation (Inaccurate Price)", desc: "Calculated fare differs from official transport rate benchmarks" },
  { value: "missing_stop", label: "Omitted Station / Stop Coordinate", desc: "A key checkpoint along the physical corridor has been skipped" },
  { value: "sequence_error", label: "Incorrect Route Order / Inverted Stops", desc: "Sequence of terminal points or intermediate nodes is out of order" },
  { value: "distance_error", label: "Faulty Distances / Cumulative KM Mismatch", desc: "Cumulative distance tracker indicates wrong interval distances" },
  { value: "other_issue", label: "Other Systems Route Bug or App Fault", desc: "For other observations, interface suggestions, or system faults" },
];

export default function ReportPopup({ isOpen, onClose, routes, selectedRouteId }: ReportPopupProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(ERROR_CATEGORIES[0].value);
  const [routeId, setRouteId] = useState(selectedRouteId || (routes[0]?.route_id || ""));
  const [notes, setNotes] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-update route ID if selectedRouteId prop changes
  React.useEffect(() => {
    if (selectedRouteId) {
      setRouteId(selectedRouteId);
    }
  }, [selectedRouteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg("Please clarify the details of the issue so we can verify the data.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          category,
          routeId,
          notes: notes.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setNotes("");
        setName("");
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2200);
      } else {
        setErrorMsg(data.error || "Failed to save mistake report on the server.");
      }
    } catch {
      setErrorMsg("Network lookup failed. Is the backend server database offline?");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="report-modal-overlay">
        {/* Ambient background blur and backdrop tint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Sheet body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
          id="report-modal-content"
        >
          {/* Accent boundary bar */}
          <div className="h-1.5 bg-amber-500 w-full" />

          {/* Modal Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-mono font-bold rounded-lg border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                DRAFT ERROR CORRECTION SUBMITTER
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-sans mt-1">
                Report Inaccuracy / System Error
              </h2>
              <p className="text-[11px] text-slate-500">
                Submit accurate logs to overwrite incorrect database entries automatically.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {success ? (
                /* Success Animated Segment */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="py-12 flex flex-col items-center text-center space-y-4"
                  id="reports-success-view"
                >
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-xs animate-bounce">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Report Stored Securely!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Your entry has been formatted and committed to <strong>reports_db.json</strong> on our server. Admin will verify and merge this correction promptly.
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Interactive Form Screen */
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  id="reports-interactive-form"
                >
                  {/* Category Selection Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                      1. What error are you reporting?
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-205 py-2.5 pl-3 pr-10 text-xs text-slate-800 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                      >
                        {ERROR_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointers-events-none" />
                    </div>
                    {/* Selected category description text */}
                    <p className="text-[10px] text-slate-400 italic">
                      💡 {ERROR_CATEGORIES.find((c) => c.value === category)?.desc}
                    </p>
                  </div>

                  {/* Route Selector & Reporter attributes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                        2. Affected Line
                      </label>
                      <div className="relative">
                        <select
                          value={routeId}
                          onChange={(e) => setRouteId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-205 py-2.5 pl-3 pr-10 text-xs text-slate-800 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                        >
                          {routes.map((r) => (
                            <option key={r.route_id} value={r.route_id}>
                              Line {r.route_id} ({r.stops.length} Stops)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointers-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                        Reporter Name (optional)
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sajid Chowdhury"
                        className="w-full bg-slate-50 border border-slate-205 px-3 py-2.5 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Clarifying Textarea Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                      3. Describe what needs correction
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Be specific (e.g., 'The fare between Farmgate and Shahbagh is 10 BDT instead of 15 BDT', or 'Mirpur stop is listed before Shyamoli but it should be Shyamoli first')."
                      className="w-full bg-slate-50 border border-slate-205 p-3 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder-slate-400 leading-relaxed"
                    />
                  </div>

                  {/* Warning banner/error toast */}
                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-shake">
                      <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
                      <p className="leading-tight font-medium">{errorMsg}</p>
                    </div>
                  )}

                  {/* Modal action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="flex-1 py-3 text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none uppercase tracking-wider text-center"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-amber-500/20 flex items-center justify-center gap-1.5 select-none uppercase tracking-wider"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving Log...
                        </>
                      ) : (
                        "Log Correction"
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
