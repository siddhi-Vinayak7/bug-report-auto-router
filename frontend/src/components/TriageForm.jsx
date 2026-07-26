import React, { useState } from 'react';
import { Send, Loader2, Sparkles, AlertCircle, FileText } from 'lucide-react';

const PRESET_SAMPLES = [
  {
    label: "Auth Issue",
    text: "Password reset email link redirects to a 404 page when clicked in Chrome."
  },
  {
    label: "Chat Bug",
    text: "Voice messages fail to play in group chat, showing a spinning loading icon indefinitely."
  },
  {
    label: "Payments Error",
    text: "Stripe checkout fails with 500 error when processing subscriptions over $1000."
  },
  {
    label: "Tasks Glitch",
    text: "Drag and drop in Kanban view duplicates task cards on reorder."
  }
];

export default function TriageForm({ onTriageSuccess, isLoading, setIsLoading, error, setError }) {
  const [reportText, setReportText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      await onTriageSuccess(reportText.trim());
    } catch (err) {
      setError(err.message || 'Failed to analyze bug report. Please check API connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (text) => {
    setReportText(text);
    setError(null);
  };

  return (
    <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-[#4F46E5]" />
          <h2 className="font-semibold text-[#1A1D29] text-lg">Input Bug Report</h2>
        </div>
        <span className="text-xs text-[#5B6072] font-mono">
          {reportText.length} characters
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg flex items-start space-x-3 text-[#DC2626] text-sm">
          <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Triage Error: </span>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reportText" className="block text-xs font-semibold text-[#5B6072] mb-1.5 uppercase tracking-wider font-mono">
            Raw User Issue / Bug Description
          </label>
          <textarea
            id="reportText"
            rows={5}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Users report two-factor authentication codes always expire immediately when entering the code from SMS..."
            className="w-full bg-[#F7F8FA] border border-[#E2E5EA] rounded-lg p-3.5 text-[#1A1D29] placeholder-[#9CA3AF] text-sm font-sans focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition duration-150 disabled:opacity-60 resize-y"
          />
        </div>

        {/* Quick Samples */}
        <div>
          <div className="flex items-center space-x-1 text-xs text-[#5B6072] mb-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sample Test Scenarios:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_SAMPLES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(sample.text)}
                disabled={isLoading}
                className="px-2.5 py-1 text-xs font-mono rounded bg-[#F1F3F6] hover:bg-[#E5E7EB] border border-[#E2E5EA] hover:border-[#D1D5DB] text-[#1A1D29] transition font-medium"
              >
                + {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!reportText.trim() || isLoading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] text-white font-medium text-sm flex items-center justify-center space-x-2 transition shadow-xs disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Running ML Classifier...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Submit for Triage</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
