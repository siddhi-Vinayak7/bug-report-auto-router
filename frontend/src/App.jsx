import React, { useState } from 'react';
import Header from './components/Header';
import TriageForm from './components/TriageForm';
import PredictionPanel from './components/PredictionPanel';
import { triageReport } from './api';
import { Database, ShieldAlert, GitCommit, Sparkles } from 'lucide-react';

export default function App() {
  const [triageResult, setTriageResult] = useState(null);
  const [currentText, setCurrentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTriageSuccess = async (text) => {
    setCurrentText(text);
    const result = await triageReport(text);
    setTriageResult(result);
  };

  const handleReset = () => {
    setTriageResult(null);
    setCurrentText('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1D29] flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <Header />

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Intro Hero Banner */}
        <div className="border border-[#E2E5EA] bg-white rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] mb-1 font-semibold">
                <Sparkles className="w-3 h-3 text-[#4F46E5]" />
                <span>AI-Assisted Ops Router</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1D29]">
                Bug Report Auto-Router & Triage Tool
              </h2>
              <p className="text-sm text-[#5B6072] max-w-2xl">
                Classify incoming raw bug reports into module targets and severity tiers automatically. Human engineers can verify or override predictions to stream feedback back into Postgres.
              </p>
            </div>
          </div>
        </div>

        {/* Core Triage Section */}
        <div className="space-y-6">
          {!triageResult ? (
            <TriageForm
              onTriageSuccess={handleTriageSuccess}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              error={error}
              setError={setError}
            />
          ) : (
            <PredictionPanel
              triageResult={triageResult}
              reportText={currentText}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Workflow Info Footer / Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E5EA]">
          <div className="p-4 rounded-lg bg-white border border-[#E2E5EA] shadow-xs space-y-1">
            <div className="flex items-center space-x-2 text-[#4F46E5] mb-1">
              <GitCommit className="w-4 h-4" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1D29]">TF-IDF NLP Pipeline</h4>
            </div>
            <p className="text-xs text-[#5B6072]">
              Scikit-learn Logistic Regression trained on tokenized sublinear TF-IDF n-grams with balanced class weights.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#E2E5EA] shadow-xs space-y-1">
            <div className="flex items-center space-x-2 text-[#D97706] mb-1">
              <ShieldAlert className="w-4 h-4" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1D29]">Confidence Calibration</h4>
            </div>
            <p className="text-xs text-[#5B6072]">
              Outputs exact probability confidence scores for both Module and Severity predictions on every report.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#E2E5EA] shadow-xs space-y-1">
            <div className="flex items-center space-x-2 text-[#059669] mb-1">
              <Database className="w-4 h-4" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1D29]">Postgres Feedback Store</h4>
            </div>
            <p className="text-xs text-[#5B6072]">
              Logs initial predictions & human overrides directly to Supabase Postgres for continuous active learning.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E5EA] bg-white py-4 text-center text-xs font-mono text-[#5B6072]">
        Engineering Operations • Bug Report Auto-Router System
      </footer>
    </div>
  );
}
