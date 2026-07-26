import React, { useEffect, useState } from 'react';
import { checkHealth } from '../api';
import { Cpu, ShieldCheck } from 'lucide-react';

export default function Header() {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  return (
    <header className="border-b border-[#E2E5EA] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-[#1A1D29] tracking-tight text-base sm:text-lg">
                <span className="text-[#4F46E5] font-semibold">Bug Router</span>
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-[#F1F3F6] text-[#5B6072] border border-[#E2E5EA]">
                v1.0 ML
              </span>
            </div>
            <p className="text-xs text-[#5B6072]">
              Automated Text Triage & Human Feedback Loop
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-[#5B6072] bg-[#F1F3F6] px-3 py-1.5 rounded-full border border-[#E2E5EA]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5B6072]" />
            <span>TF-IDF + LogReg Pipeline</span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono px-2.5 py-1 rounded-full border border-[#E2E5EA] bg-white">
            <span
              className={`h-2 w-2 rounded-full ${
                online === true
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse'
                  : online === false
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-[#1A1D29] font-medium">
              {online === true ? 'API Online' : online === false ? 'API Offline' : 'Checking...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
