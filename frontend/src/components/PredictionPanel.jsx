import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Layers, Gauge, Check, RefreshCw, Edit3 } from 'lucide-react';
import { submitCorrection } from '../api';

const MODULE_OPTIONS = ['Auth', 'Chat', 'Tasks', 'Profile', 'Payments', 'Other'];
const SEVERITY_OPTIONS = ['Critical', 'Major', 'Minor'];

export default function PredictionPanel({ triageResult, reportText, onReset }) {
  const {
    report_id,
    module: predictedModule,
    severity: predictedSeverity,
    module_confidence: moduleConfidence,
    severity_confidence: severityConfidence,
    module_reason_words: moduleReasonWords = [],
    severity_reason_words: severityReasonWords = []
  } = triageResult;

  const [selectedModule, setSelectedModule] = useState(predictedModule);
  const [selectedSeverity, setSelectedSeverity] = useState(predictedSeverity);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const isModuleEdited = selectedModule !== predictedModule;
  const isSeverityEdited = selectedSeverity !== predictedSeverity;
  const isAnyEdited = isModuleEdited || isSeverityEdited;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSaveError(null);

    try {
      await submitCorrection(
        report_id,
        predictedModule,
        isModuleEdited ? selectedModule : null,
        predictedSeverity,
        isSeverityEdited ? selectedSeverity : null
      );

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.message || 'Failed to save correction to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeveritySelectStyle = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] focus:ring-[#DC2626]';
      case 'Major':
        return 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D] focus:ring-[#D97706]';
      case 'Minor':
        return 'bg-[#D1FAE5] text-[#059669] border-[#6EE7B7] focus:ring-[#059669]';
      default:
        return 'bg-white text-[#1A1D29] border-[#E2E5EA]';
    }
  };

  const getSeverityBadgeStyle = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]';
      case 'Major':
        return 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]';
      case 'Minor':
        return 'bg-[#D1FAE5] text-[#059669] border-[#6EE7B7]';
      default:
        return 'bg-[#F1F3F6] text-[#5B6072] border-[#E2E5EA]';
    }
  };

  return (
    <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5EA] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-medium">
              Report #{report_id}
            </span>
            <span className="text-xs text-[#5B6072] font-mono">Triage Analysis Complete</span>
          </div>
          <h2 className="font-semibold text-[#1A1D29] text-lg mt-1">Predicted Routing & Severity</h2>
        </div>

        <button
          onClick={onReset}
          className="text-xs text-[#5B6072] hover:text-[#1A1D29] flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#F1F3F6] hover:bg-[#E5E7EB] border border-[#E2E5EA] transition font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>New Triage</span>
        </button>
      </div>

      {/* Original Bug Text Preview */}
      <div className="p-3.5 bg-[#F7F8FA] border border-[#E2E5EA] rounded-lg text-xs font-mono text-[#5B6072] space-y-1">
        <span className="text-[#5B6072] uppercase tracking-wider text-[10px] font-bold">Triage Input Text:</span>
        <p className="font-sans text-sm text-[#1A1D29] line-clamp-3 italic">"{reportText}"</p>
      </div>

      {saveSuccess ? (
        /* Success Card */
        <div className="p-6 bg-[#D1FAE5] border border-[#A7F3D0] rounded-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white border border-[#6EE7B7] flex items-center justify-center mx-auto text-[#059669]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#065F46]">Routing Confirmed & Saved</h3>
          <p className="text-sm text-[#047857] max-w-md mx-auto">
            {isAnyEdited
              ? 'Human correction logged to database. This feedback will refine future retrainings.'
              : 'Model prediction verified and logged to database.'}
          </p>
          <div className="pt-2">
            <button
              onClick={onReset}
              className="px-5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-sm transition shadow-xs"
            >
              Triage Another Report
            </button>
          </div>
        </div>
      ) : (
        <>
          {saveError && (
            <div className="p-3.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg flex items-center space-x-2 text-[#DC2626] text-sm">
              <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* MODULE CARD */}
            <div
              className={`p-4 rounded-xl border transition ${
                isModuleEdited
                  ? 'bg-white border-[#4F46E5] ring-1 ring-[#4F46E5]/40 shadow-xs'
                  : 'bg-[#F7F8FA] border-[#E2E5EA]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#4F46E5]" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#5B6072]">
                    Module Assignment
                  </span>
                </div>
                {isModuleEdited && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] flex items-center space-x-1 font-semibold">
                    <Edit3 className="w-3 h-3" />
                    <span>Edited</span>
                  </span>
                )}
              </div>

              <div className="mb-3">
                <label className="text-xs text-[#5B6072] font-medium mb-1 block">Module Selection:</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full bg-white border border-[#E2E5EA] rounded-lg px-3 py-2 text-[#1A1D29] font-medium text-sm focus:outline-none focus:border-[#4F46E5]"
                >
                  {MODULE_OPTIONS.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod} {mod === predictedModule ? '(Model Prediction)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence Bar */}
              <div className="pt-2 border-t border-[#E2E5EA]">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-[#5B6072] font-mono font-medium">Model Confidence</span>
                  <span className="font-mono font-bold text-[#4F46E5]">
                    {(moduleConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden border border-[#D1D5DB]">
                  <div
                    className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, moduleConfidence * 100))}%` }}
                  />
                </div>
                {moduleReasonWords && moduleReasonWords.length > 0 && (
                  <div className="mt-2 text-xs text-[#5B6072]">
                    <span className="font-mono font-medium">Key signal words: </span>
                    <span className="font-mono font-semibold text-[#4F46E5]">
                      {moduleReasonWords.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SEVERITY CARD */}
            <div
              className={`p-4 rounded-xl border transition ${
                isSeverityEdited
                  ? 'bg-white border-[#D97706] ring-1 ring-[#D97706]/40 shadow-xs'
                  : 'bg-[#F7F8FA] border-[#E2E5EA]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-[#D97706]" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#5B6072]">
                    Severity Level
                  </span>
                </div>
                {isSeverityEdited && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] flex items-center space-x-1 font-semibold">
                    <Edit3 className="w-3 h-3" />
                    <span>Edited</span>
                  </span>
                )}
              </div>

              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-[#5B6072] font-medium block">Severity Level:</label>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getSeverityBadgeStyle(
                      selectedSeverity
                    )}`}
                  >
                    {selectedSeverity}
                  </span>
                </div>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className={`w-full font-medium text-sm rounded-lg px-3 py-2 border focus:outline-none transition ${getSeveritySelectStyle(
                    selectedSeverity
                  )}`}
                >
                  {SEVERITY_OPTIONS.map((sev) => (
                    <option key={sev} value={sev} className="bg-white text-[#1A1D29]">
                      {sev} {sev === predictedSeverity ? '(Model Prediction)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence Bar */}
              <div className="pt-2 border-t border-[#E2E5EA]">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-[#5B6072] font-mono font-medium">Model Confidence</span>
                  <span className="font-mono font-bold text-[#D97706]">
                    {(severityConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden border border-[#D1D5DB]">
                  <div
                    className="bg-[#D97706] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, severityConfidence * 100))}%` }}
                  />
                </div>
                {severityReasonWords && severityReasonWords.length > 0 && (
                  <div className="mt-2 text-xs text-[#5B6072]">
                    <span className="font-mono font-medium">Key signal words: </span>
                    <span className="font-mono font-semibold text-[#D97706]">
                      {severityReasonWords.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="pt-4 border-t border-[#E2E5EA] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#5B6072] font-medium flex items-center space-x-2">
              {isAnyEdited ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Human override detected — will log as training feedback.</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Accepting ML predictions directly.</span>
                </>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-medium text-sm flex items-center justify-center space-x-2 transition shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Feedback...' : 'Confirm & Save Routing'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
