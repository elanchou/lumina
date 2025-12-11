
import React, { useState, useEffect } from 'react';
import { ViewState, Asset, AssetType, DashboardWidget } from './types';
import { MOCK_ASSETS } from './constants';
import Dashboard from './components/Dashboard';
import Market from './components/Market';
import ChatInterface from './components/ChatInterface';
import Analysis from './components/Analysis';
import Modal from './components/Modal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState | 'chat'>('dashboard');
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  
  // Default Widgets
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'default-1',
      type: 'metric',
      title: 'Net Liquidation',
      subTitle: '24h Change',
      data: { value: '$180,430', trend: '+1.2%' },
      size: 'small',
      visualStyle: 'default'
    },
    {
      id: 'default-2',
      type: 'metric',
      title: 'Day P&L',
      subTitle: 'Realized Gain',
      data: { value: '+$2,140.50' },
      size: 'small',
      visualStyle: 'success'
    },
    {
      id: 'default-3',
      type: 'metric',
      title: 'Buying Power',
      subTitle: 'Available Cash',
      data: { value: '$12,430.00' },
      size: 'small',
      visualStyle: 'default'
    },
    {
      id: 'default-4',
      type: 'metric',
      title: 'Risk Level',
      subTitle: 'Beta: 1.05',
      data: { value: 'Moderate' },
      size: 'small',
      visualStyle: 'accent'
    }
  ]);
  
  const [settings, setSettings] = useState({
      notifications: true,
      currency: 'USD',
      theme: 'Dark',
      highContrast: false
  });

  // Toast Logic
  useEffect(() => {
      if (toast) {
          const timer = setTimeout(() => setToast(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
      setToast({ message, type });
  };

  const handleAddWidget = (widget: DashboardWidget) => {
    setWidgets(prev => [...prev, widget]);
    showToast(`Added "${widget.title}" to Dashboard`, 'success');
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  // Handler to buy from Market Tab
  const handleAddToPortfolio = (symbol: string, name: string, price: number, type: AssetType) => {
      const newAsset: Asset = {
          id: Date.now().toString(),
          name: name,
          symbol: symbol,
          type: type,
          value: price * (type === AssetType.CRYPTO ? 0.5 : 10), // Simulating buying 0.5 BTC or 10 Shares default
          changePercent: 0,
          allocation: 0
      };
      
      // Recalculate allocations
      const updatedAssets = [...assets, newAsset];
      const total = updatedAssets.reduce((s, a) => s + a.value, 0);
      const finalAssets = updatedAssets.map(a => ({
          ...a,
          allocation: parseFloat(((a.value / total) * 100).toFixed(1))
      }));
      
      setAssets(finalAssets);
      showToast(`Added ${symbol} to Portfolio`, 'success');
  };

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-lumina-bg text-slate-200 font-sans selection:bg-lumina-accent/30 bg-gradient-to-br from-lumina-bg via-[#050b1a] to-[#02040a] overflow-hidden flex flex-col">
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px]"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Toast Notification */}
      {toast && (
          <div className="fixed top-20 right-4 md:right-8 z-[60] animate-fade-in max-w-[90vw]">
              <div className={`px-4 py-3 rounded-lg border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                  <span className="text-sm font-medium text-white">{toast.message}</span>
              </div>
          </div>
      )}

      {/* Top Navigation Bar */}
      <header className="flex-none sticky top-0 z-50 w-full border-b border-glass-border bg-lumina-bg/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 select-none cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
             <div className="relative flex items-center justify-center w-8 h-8">
                 <div className="absolute inset-0 bg-blue-500 blur-[20px] opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                 <svg className="w-7 h-7 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#logoGradient)" />
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                    </defs>
                 </svg>
             </div>
             <div>
               <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                 LUMINA
               </h1>
               <div className="text-[9px] font-sans font-medium text-blue-400 tracking-[0.3em] uppercase opacity-80 group-hover:text-cyan-300 transition-colors">
                 Finance GPT
               </div>
             </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center p-1 bg-white/5 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-lumina-accent text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('market')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'market' ? 'bg-lumina-accent text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Market
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'analysis' ? 'bg-lumina-accent text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Analysis
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
             <button 
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-lumina-accent text-white' : 'text-blue-400 hover:bg-blue-500/10'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              Ask AI
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             </button>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#0b1120] flex items-center justify-center text-xs font-bold">
                    JD
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full overflow-hidden">
        
        {/* Desktop Side Chat (Always Visible on Large Screens) */}
        <aside className="hidden xl:flex w-[380px] flex-shrink-0 flex-col h-full py-8 pb-8 pl-6">
             <div className="flex-1 bg-glass-200 backdrop-blur-xl border border-glass-border rounded-2xl overflow-hidden flex flex-col shadow-xl">
                 <div className="p-4 border-b border-glass-border bg-white/5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Gemini Assistant
                    </h3>
                 </div>
                 <div className="flex-1 overflow-hidden relative">
                     <div className="absolute inset-0">
                        <ChatInterface assets={assets} onAddWidget={handleAddWidget} />
                     </div>
                 </div>
             </div>
        </aside>

        {/* Main View Area */}
        <section className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-6 pb-24 lg:pb-8">
            {activeTab === 'dashboard' && (
              <Dashboard 
                assets={assets} 
                setAssets={setAssets} 
                widgets={widgets}
                onRemoveWidget={handleRemoveWidget}
              />
            )}
            {activeTab === 'market' && <Market onAddToPortfolio={handleAddToPortfolio} />}
            {activeTab === 'analysis' && <Analysis assets={assets} />}
            {/* Mobile Chat View */}
            {activeTab === 'chat' && (
                <div className="h-full flex flex-col bg-glass-200 border border-glass-border rounded-2xl overflow-hidden">
                     <ChatInterface assets={assets} onAddWidget={handleAddWidget} />
                </div>
            )}
        </section>
      </main>

      {/* Mobile Bottom Navigation Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0b1120]/90 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex justify-between items-center z-50 safe-area-pb">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-lumina-accent' : 'text-gray-500'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span className="text-[10px] font-medium">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'market' ? 'text-lumina-accent' : 'text-gray-500'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              <span className="text-[10px] font-medium">Market</span>
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'analysis' ? 'text-lumina-accent' : 'text-gray-500'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              <span className="text-[10px] font-medium">Insights</span>
          </button>
           <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-lumina-accent' : 'text-gray-500'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
              <span className="text-[10px] font-medium">AI Chat</span>
          </button>
      </nav>

      {/* Settings Modal */}
      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        title="Platform Settings"
        size="sm"
      >
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-white font-medium">Notifications</div>
                    <div className="text-gray-500 text-xs">Receive alerts for price movements</div>
                </div>
                <button 
                    onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                    className={`w-10 h-6 rounded-full transition-colors relative ${settings.notifications ? 'bg-lumina-accent' : 'bg-gray-700'}`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-4' : ''}`}></div>
                </button>
            </div>

             <div className="flex items-center justify-between">
                <div>
                    <div className="text-white font-medium">Display Currency</div>
                    <div className="text-gray-500 text-xs">Base currency for portfolio</div>
                </div>
                <select 
                    value={settings.currency}
                    onChange={(e) => setSettings({...settings, currency: e.target.value})}
                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white"
                >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>JPY</option>
                </select>
            </div>

             <div className="flex items-center justify-between">
                <div>
                    <div className="text-white font-medium">Theme</div>
                    <div className="text-gray-500 text-xs">Interface appearance</div>
                </div>
                <div className="flex bg-black/30 rounded p-1 border border-white/10">
                    <button className="px-3 py-1 bg-white/10 rounded text-xs text-white">Dark</button>
                    <button className="px-3 py-1 text-xs text-gray-500">Light</button>
                </div>
            </div>
             <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                 Lumina Finance GPT v1.2.0<br/>
                 Powered by Gemini 2.5 Flash
             </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
