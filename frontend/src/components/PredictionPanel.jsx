import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Layers, Gauge, Check, RefreshCw, Edit3, Sparkles, Loader2, Bot, HelpCircle } from 'lucide-react';
import { submitCorrection, suggestFix } from '../api';

const MODULE_OPTIONS = ['Auth', 'Chat', 'Tasks', 'Profile', 'Payments', 'Other'];
const SEVERITY_OPTIONS = ['Critical', 'Major', 'Minor'];

const MODULE_TEAM_MAP = {
  Auth: 'Identity & Access Team',
  Chat: 'Messaging Team',
  Tasks: 'Workflow Team',
  Profile: 'Account Team',
  Payments: 'Billing Team',
  Other: 'General Engineering',
};

export default function PredictionPanel({ triageResult, reportText, onReset }) {
  const {
    report_id,
    module: predictedModule,
    severity: predictedSeverity,
    module_confidence: moduleConfidence,
    severity_confidence: severityConfidence,
    module_reason_words: moduleReasonWords = [],
    severity_reason_words: severityReasonWords = [],
    routed_team: initialRoutedTeam = 'General Engineering',
    low_confidence_flag: lowConfidenceFlag = false,
    decision_source: decisionSource = 'llm'
  } = triageResult;

  const isInsufficientInfo = decisionSource === 'llm_insufficient_info';

  const [selectedModule, setSelectedModule] = useState(predictedModule || '');
  const [selectedSeverity, setSelectedSeverity] = useState(predictedSeverity || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);

  const isModuleEdited = !isInsufficientInfo && selectedModule !== predictedModule;
  const isSeverityEdited = !isInsufficientInfo && selectedSeverity !== predictedSeverity;
  const isAnyEdited = isInsufficientInfo || isModuleEdited || isSeverityEdited;

  const activeRoutedTeam = isInsufficientInfo
    ? (selectedModule ? (MODULE_TEAM_MAP[selectedModule] || 'General Engineering') : 'Unassigned')
    : initialRoutedTeam;

  const handleGetSuggestion = async () => {
    if (!selectedModule || !selectedSeverity) return;

    setIsFetchingSuggestion(true);
    setSuggestionError(null);

    try {
      const res = await suggestFix(reportText, selectedModule, selectedSeverity);
      setAiSuggestion(res.suggestion);
    } catch (err) {
      setSuggestionError('AI suggestion unavailable right now');
    } finally {
      setIsFetchingSuggestion(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSaveError(null);

    try {
      if (isInsufficientInfo) {
        // Send 'INSUFFICIENT_INFO' as original_module/original_severity since DB columns are NOT NULL constrained on corrections table
        await submitCorrection(
          report_id,
          'INSUFFICIENT_INFO',
          selectedModule,
          'INSUFFICIENT_INFO',
          selectedSeverity
        );
      } else {
        await submitCorrection(
          report_id,
          predictedModule,
          isModuleEdited ? selectedModule : null,
          predictedSeverity,
          isSeverityEdited ? selectedSeverity : null
        );
      }

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

  const isSubmitDisabled = isSubmitting || (isInsufficientInfo && (!selectedModule || !selectedSeverity));

  return (
    <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5EA] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] font-medium">
              Report #{report_id}
            </span>
            {isInsufficientInfo ? (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] font-medium flex items-center space-x-1">
                <HelpCircle className="w-3 h-3 text-[#D97706]" />
                <span>Needs Manual Triage</span>
              </span>
            ) : decisionSource === 'llm' ? (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F3E8FF] text-[#7C3AED] border border-[#DDD6FE] font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#7C3AED]" />
                <span>AI-reviewed</span>
              </span>
            ) : (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] font-medium">
                Model prediction
              </span>
            )}
            <span className="text-xs text-[#5B6072] font-mono">
              {isInsufficientInfo ? 'Triage Review Required' : 'Triage Analysis Complete'}
            </span>
          </div>
          <h2 className="font-semibold text-[#1A1D29] text-lg mt-1">
            {isInsufficientInfo ? 'Manual Triage Required' : 'Predicted Routing & Severity'}
          </h2>
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

      {/* Insufficient Information Banner OR Low Confidence Warning Notice */}
      {isInsufficientInfo ? (
        <div className="p-4 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl flex items-start space-x-3 text-[#B45309] text-sm">
          <AlertTriangle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-[#92400E]">Insufficient Information for Auto-Triage</span>
            <p className="text-xs text-[#B45309] mt-0.5 leading-relaxed">
              This report doesn't contain enough information to auto-triage. Please select the module and severity manually below.
            </p>
          </div>
        </div>
      ) : (
        lowConfidenceFlag && (
          <div className="p-3.5 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg flex items-center space-x-2.5 text-[#D97706] text-xs font-mono font-medium">
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span>⚠️ Low confidence prediction — consider manual review</span>
          </div>
        )
      )}

      {saveSuccess ? (
        /* Success Card */
        <div className="p-6 bg-[#D1FAE5] border border-[#A7F3D0] rounded-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white border border-[#6EE7B7] flex items-center justify-center mx-auto text-[#059669]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#065F46]">Routing Confirmed & Saved</h3>
          <p className="text-sm text-[#047857] max-w-md mx-auto">
            {isInsufficientInfo
              ? 'Manual triage selection logged to database.'
              : isAnyEdited
              ? 'Human correction logged to database. This feedback will refine future retrainings.'
              : (decisionSource === 'llm'
                  ? 'AI decision verified and logged to database.'
                  : 'Classifier prediction verified and logged to database.')}
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
                isModuleEdited || (isInsufficientInfo && selectedModule)
                  ? 'bg-white border-[#4F46E5] ring-1 ring-[#4F46E5]/40 shadow-xs'
                  : isInsufficientInfo
                  ? 'bg-white border-[#E2E5EA]'
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
                  {isInsufficientInfo && (
                    <option value="" disabled>-- Select Module --</option>
                  )}
                  {MODULE_OPTIONS.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod} {!isInsufficientInfo && mod === predictedModule ? (decisionSource === 'llm' ? '(AI Decision)' : '(Model Prediction)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Bottom Info / Confidence Bar */}
              <div className="pt-2 border-t border-[#E2E5EA]">
                {!isInsufficientInfo ? (
                  <>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#5B6072] font-mono font-medium">Classifier Confidence</span>
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
                    <div className="mt-1.5 text-xs text-[#5B6072]">
                      <span className="font-mono font-medium">Routes to: </span>
                      <span className="font-mono font-semibold text-[#1A1D29]">
                        {activeRoutedTeam}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[#5B6072]">
                    <span className="font-mono font-medium">Routes to: </span>
                    <span className="font-mono font-semibold text-[#1A1D29]">
                      {activeRoutedTeam}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SEVERITY CARD */}
            <div
              className={`p-4 rounded-xl border transition ${
                isSeverityEdited || (isInsufficientInfo && selectedSeverity)
                  ? 'bg-white border-[#D97706] ring-1 ring-[#D97706]/40 shadow-xs'
                  : isInsufficientInfo
                  ? 'bg-white border-[#E2E5EA]'
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
                  {selectedSeverity ? (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getSeverityBadgeStyle(
                        selectedSeverity
                      )}`}
                    >
                      {selectedSeverity}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-[#F1F3F6] text-[#5B6072] border-[#E2E5EA]">
                      Unselected
                    </span>
                  )}
                </div>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className={`w-full font-medium text-sm rounded-lg px-3 py-2 border focus:outline-none transition ${getSeveritySelectStyle(
                    selectedSeverity
                  )}`}
                >
                  {isInsufficientInfo && (
                    <option value="" disabled className="bg-white text-[#5B6072]">-- Select Severity --</option>
                  )}
                  {SEVERITY_OPTIONS.map((sev) => (
                    <option key={sev} value={sev} className="bg-white text-[#1A1D29]">
                      {sev} {!isInsufficientInfo && sev === predictedSeverity ? (decisionSource === 'llm' ? '(AI Decision)' : '(Model Prediction)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Bottom Info / Confidence Bar */}
              <div className="pt-2 border-t border-[#E2E5EA]">
                {!isInsufficientInfo ? (
                  <>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#5B6072] font-mono font-medium">Classifier Confidence</span>
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
                  </>
                ) : (
                  <div className="text-xs text-[#5B6072]">
                    <span className="font-mono font-medium">Status: </span>
                    <span className="font-mono font-semibold text-[#1A1D29]">
                      {selectedSeverity ? `Selected (${selectedSeverity})` : 'Awaiting Selection'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="pt-4 border-t border-[#E2E5EA] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#5B6072] font-medium flex items-center space-x-2">
              {isInsufficientInfo ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>
                    {selectedModule && selectedSeverity
                      ? 'Manual triage selection ready.'
                      : 'Select module and severity to confirm.'}
                  </span>
                </>
              ) : isAnyEdited ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Human override detected — will log as training feedback.</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    {decisionSource === 'llm'
                      ? 'Accepting AI decision directly.'
                      : 'Accepting classifier prediction directly.'}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={isSubmitDisabled}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-medium text-sm flex items-center justify-center space-x-2 transition shadow-xs disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Feedback...' : 'Confirm & Save Routing'}</span>
            </button>
          </div>

          {/* AI Fix Suggestion Section */}
          <div className="pt-4 border-t border-[#E2E5EA] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#5B6072] font-medium">
                Want AI assistance investigating this issue?
              </div>

              <button
                onClick={handleGetSuggestion}
                disabled={isFetchingSuggestion || !selectedModule || !selectedSeverity}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#F3E8FF] hover:bg-[#E9D5FF] border border-[#D8B4FE] text-[#6B21A8] font-medium text-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isFetchingSuggestion ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6B21A8]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#6B21A8]" />
                )}
                <span>{isFetchingSuggestion ? 'Fetching AI Suggestion...' : 'Get AI Suggestion'}</span>
              </button>
            </div>

            {suggestionError && (
              <div className="text-xs text-[#6B21A8] bg-[#F3E8FF] border border-[#E9D5FF] rounded-lg p-2.5 font-medium">
                ℹ️ {suggestionError}
              </div>
            )}

            {aiSuggestion && (
              <div className="p-4 bg-[#F3E8FF] border border-[#D8B4FE] rounded-xl space-y-2 text-[#5B21B6]">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#6B21A8]">
                  <Bot className="w-4 h-4 text-[#6B21A8]" />
                  <span>AI-Generated Suggestion (not authoritative — for reference only)</span>
                </div>
                <p className="text-xs sm:text-sm text-[#4C1D95] leading-relaxed font-sans">
                  {aiSuggestion}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
