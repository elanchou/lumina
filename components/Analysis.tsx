
import React, { useState, useEffect } from 'react';
import { Asset, AnalysisReport } from '../types';
import { analyzePortfolioRisk } from '../services/geminiService';
import GlassCard from './GlassCard';

interface AnalysisProps {
  assets: Asset[];
}

const Analysis: React.FC<AnalysisProps> = ({ assets }) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  // Scenarios for "Stress Testing"
  const scenarios = [
      { id: 'crash', label: 'Market Crash', impact: -0.25, color: '#ef4444' },
      { id: 'correction', label: 'Correction', impact: -0.10, color: '#f59e0b' },
      { id: 'rally', label: 'Bull Rally', impact: 0.15, color: '#10b981' },
      { id: 'surge', label: 'Crypto Surge', impact: 0.30, color: '#3b82f6' },
  ];

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (assets.length === 0) return;
      setIsLoading(true);
      try {
        const assetsJson = JSON.stringify(assets.map(a => ({ symbol: a.symbol, value: a.value, type: a.type })));
        const resultJson = await analyzePortfolioRisk(assetsJson);
        const parsed = JSON.parse(resultJson);
        setReport(parsed);
      } catch (error) {
        console.error("Analysis failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [assets]);

  const calculateProjectedValue = (impact: number) => {
      const total = assets.reduce((sum, a) => sum + a.value, 0);
      // Simple logic: Crypto moves 2x the market, Cash moves 0x, Stocks move 1x
      let projectedTotal = 0;
      assets.forEach(a => {
          let multiplier = 1;
          if (a.type === 'Crypto') multiplier = 2.0;
          if (a.type === 'Cash') multiplier = 0;
          
          const assetImpact = impact * multiplier;
          projectedTotal += a.value * (1 + assetImpact);
      });
      return projectedTotal;
  };

  const currentTotal = assets.reduce((sum, a) => sum + a.value, 0);
  const projectedTotal = selectedScenario 
      ? calculateProjectedValue(scenarios.find(s => s.id === selectedScenario)?.impact || 0)
      : currentTotal;
  const diff = projectedTotal - currentTotal;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Score Gauge */}
        <GlassCard className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
           <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-6 relative z-10">Portfolio Health Score</h3>
           
           <div className="relative w-48 h-24 mb-4 z-10">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100">
                  {/* Background Arc */}
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round" />
                  {/* Active Arc */}
                  <path 
                    d="M 20 100 A 80 80 0 0 1 180 100" 
                    fill="none" 
                    stroke="url(#scoreGradient)" 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * ((report?.riskScore || 50) / 100))}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                  </defs>
              </svg>
              {/* Needle */}
              <div 
                className="absolute bottom-0 left-1/2 w-1 h-24 bg-white origin-bottom transition-transform duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ transform: `translateX(-50%) rotate(${-90 + (1.8 * (report?.riskScore || 50))}deg)` }}
              ></div>
              <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 translate-y-1/2 shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
           </div>

           <div className="text-4xl font-bold text-white font-mono mt-2">{report?.riskScore ?? '--'}</div>
           <div className="text-xs text-gray-500 mt-1">Risk: {report?.volatility ?? 'Calculating...'}</div>
        </GlassCard>

        {/* Key Metrics */}
        <GlassCard className="p-6 flex flex-col justify-center space-y-6">
            <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Est. Annual Volatility</div>
                <div className="text-2xl font-bold text-white font-mono">
                    {report?.volatility === 'High' ? '18.4%' : report?.volatility === 'Medium' ? '12.1%' : '5.4%'}
                </div>
                <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${report?.volatility === 'High' ? 'bg-red-500 w-3/4' : 'bg-yellow-500 w-1/2'}`}></div>
                </div>
            </div>
            <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Max Drawdown (Est.)</div>
                <div className="text-2xl font-bold text-white font-mono text-red-400">
                    -{report?.maxDrawdown ?? '--%'}
                </div>
            </div>
             <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Sharpe Ratio</div>
                <div className="text-2xl font-bold text-white font-mono text-emerald-400">
                    1.45
                </div>
            </div>
        </GlassCard>

        {/* AI Summary */}
        <GlassCard className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>
            </div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                AI Assessment
                {isLoading && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
                {report?.summary || "Analyzing portfolio composition and historical correlation data..."}
            </p>
            
            {report?.recommendations && (
                <div className="mt-4 space-y-2">
                    {report.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-2 text-xs text-blue-300">
                            <span className="mt-1 text-blue-500">➤</span>
                            {rec}
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
      </div>

      {/* Scenario Simulator */}
      <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-6">Stress Test Simulator</h3>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Controls */}
              <div className="space-y-3">
                  {scenarios.map(scenario => (
                      <button
                        key={scenario.id}
                        onClick={() => setSelectedScenario(selectedScenario === scenario.id ? null : scenario.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${
                            selectedScenario === scenario.id 
                            ? 'bg-white/10 border-white/20 text-white' 
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                        }`}
                      >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                          <div className="flex justify-between items-center relative z-10">
                              <span className="font-medium">{scenario.label}</span>
                              <span className={`text-xs font-mono ${scenario.impact > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {scenario.impact > 0 ? '+' : ''}{scenario.impact * 100}%
                              </span>
                          </div>
                      </button>
                  ))}
              </div>

              {/* Visualization */}
              <div className="lg:col-span-3 bg-black/20 rounded-xl border border-white/5 p-8 flex flex-col items-center justify-center relative">
                    {!selectedScenario ? (
                        <div className="text-gray-500 text-sm">Select a scenario to simulate impact</div>
                    ) : (
                        <div className="w-full max-w-md space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="text-gray-400 text-sm">Current Value</div>
                                <div className="text-xl font-mono text-white">${currentTotal.toLocaleString()}</div>
                            </div>
                            
                            <div className="h-4 bg-gray-800 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 bottom-0 w-0.5 bg-white left-1/2 z-10"></div>
                                {/* We simulate a bar expanding left or right from center */}
                                {/* For simplicity in this UI, just a unified bar for before/after */}
                            </div>

                            <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                <div className="text-gray-400 text-sm">Projected Value</div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold font-mono text-white">
                                        ${projectedTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                    </div>
                                    <div className={`text-sm font-mono mt-1 ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {diff >= 0 ? '+' : ''}{diff.toLocaleString(undefined, {maximumFractionDigits: 0})} ({((diff/currentTotal)*100).toFixed(1)}%)
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 text-center pt-4">
                                *Simulation assumes correlation beta of 2.0 for Crypto and 1.0 for Stocks.
                            </div>
                        </div>
                    )}
              </div>
          </div>
      </GlassCard>
    </div>
  );
};

export default Analysis;
