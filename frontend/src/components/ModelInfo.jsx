import React from "react";
import { BarChart2, FlaskConical } from "lucide-react";

/**
 * ModelInfo — static, display-only panel.
 * Shows baseline accuracy figures and the SVM comparison note.
 * No API calls, no props, no state.
 */
export default function ModelInfo() {
  return (
    <div className="bg-white border border-[#E2E5EA] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-[#E2E5EA] pb-3">
        <BarChart2 className="w-4 h-4 text-[#4F46E5]" />
        <h3 className="text-sm font-semibold text-[#1A1D29] tracking-tight">
          Model Info
        </h3>
      </div>

      {/* Accuracy rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E5EA]">
          <span className="text-xs font-mono text-[#5B6072]">Module classifier accuracy</span>
          <span className="text-xs font-mono font-bold text-[#4F46E5]">75.00%</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E5EA]">
          <span className="text-xs font-mono text-[#5B6072]">Severity classifier accuracy</span>
          <span className="text-xs font-mono font-bold text-[#4F46E5]">45.00%</span>
        </div>
      </div>

      {/* Method note */}
      <p className="text-xs text-[#5B6072] leading-relaxed">
        Classifiers: TF-IDF + Logistic Regression, retrained on an expanded
        100-row dataset with diversified vocabulary and evaluated once on a
        locked 20-report held-out test set.
      </p>

      {/* SVM comparison note */}
      <div className="flex items-start space-x-2.5 px-3.5 py-3 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE]">
        <FlaskConical className="w-3.5 h-3.5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#4338CA] leading-relaxed">
          An SVM (LinearSVC) alternative was also tested — it matched or
          slightly outperformed Logistic Regression, but Logistic Regression
          remains deployed. Full comparison in{" "}
          <span className="font-mono font-semibold">docs/ACCURACY_REPORT.md</span>{" "}
          in the repo.
        </p>
      </div>
    </div>
  );
}
