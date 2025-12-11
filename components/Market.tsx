import React, { useEffect, useState, useRef } from 'react';
import { MarketTicker, AssetType } from '../types';
import { marketService } from '../services/marketService';
import { STOCK_DICTIONARY } from '../constants';
import GlassCard from './GlassCard';
import Sparkline from './Sparkline';
import Modal from './Modal';

interface MarketProps {
    onAddToPortfolio?: (symbol: string, name: string, price: number, type: AssetType) => void;
}

const Market: React.FC<MarketProps> = ({ onAddToPortfolio }) => {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [dynamicCoins, setDynamicCoins] = useState<{symbol:string, name:string, type:string}[]>([]);
  
  // Detail Modal State
  const [selectedTicker, setSelectedTicker] = useState<MarketTicker | null>(null);

  useEffect(() => {
    const unsubscribe = marketService.subscribe((data) => {
      setTickers(data);
      // Update the selected ticker with real-time data if open
      if (selectedTicker) {
          const updated = data.find(t => t.symbol === selectedTicker.symbol);
          if (updated) setSelectedTicker(updated);
      }
    });
    
    const updateCoins = () => {
        setDynamicCoins(marketService.availableCoins);
    };
    updateCoins();
    const interval = setInterval(updateCoins, 2000);

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, [selectedTicker]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSymbols = [...STOCK_DICTIONARY, ...dynamicCoins];
  const filteredSymbols = allSymbols.filter(s => 
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  const handleAddTicker = (symbol: string, type: string) => {
    marketService.addTicker(symbol, type as 'US' | 'CRYPTO');
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    marketService.addTicker(searchTerm, 'US');
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleRemoveTicker = (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      marketService.removeTicker(symbol);
      if (selectedTicker?.symbol === symbol) setSelectedTicker(null);
  };

  const handleBuyFromModal = () => {
      if (!selectedTicker || !onAddToPortfolio) return;
      
      const type = selectedTicker.type === 'CRYPTO' ? AssetType.CRYPTO : AssetType.STOCK;
      onAddToPortfolio(selectedTicker.symbol, selectedTicker.name, selectedTicker.price, type);
      setSelectedTicker(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Market Watch</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live CMC & Binance Feed
                </div>
            </div>

            {/* Search */}
            <div className="relative z-30 w-full md:w-96" ref={searchRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <form onSubmit={handleManualSubmit}>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onFocus={() => setShowDropdown(true)}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowDropdown(true);
                            }}
                            placeholder="Search Crypto or Stocks..."
                            className="w-full bg-glass-200 border border-glass-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-lumina-accent focus:ring-1 focus:ring-lumina-accent focus:outline-none transition-all"
                        />
                    </form>
                </div>

                {/* Dropdown */}
                {showDropdown && searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0b1120] border border-glass-border rounded-lg shadow-2xl overflow-hidden animate-fade-in max-h-64 overflow-y-auto backdrop-blur-xl">
                        {filteredSymbols.length > 0 ? (
                            filteredSymbols.map((item) => (
                                <button
                                    key={item.symbol}
                                    onClick={() => handleAddTicker(item.symbol, item.type)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${item.type === 'CRYPTO' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {item.type === 'CRYPTO' ? '₿' : 'S'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{item.symbol}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[160px]">{item.name}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 border border-white/10 px-1.5 py-0.5 rounded">{item.type}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-xs text-gray-500 text-center">Press Enter to add "{searchTerm}"</div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tickers.map((ticker) => {
                const isPositive = ticker.change >= 0;
                const color = isPositive ? '#10b981' : '#ef4444';
                const dataValues = ticker.dataPoints?.map(d => d.value) || [];

                return (
                <GlassCard 
                    key={ticker.symbol} 
                    className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-900/10 cursor-pointer hover:bg-glass-300"
                >
                    <div onClick={() => setSelectedTicker(ticker)}>
                        <button 
                            onClick={(e) => handleRemoveTicker(e, ticker.symbol)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 text-gray-500 hover:text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-all z-20"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${ticker.type === 'CRYPTO' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                        {ticker.type === 'CRYPTO' ? '₿' : ticker.symbol[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{ticker.symbol}</h3>
                                        <p className="text-xs text-gray-400 truncate max-w-[120px]">{ticker.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-mono font-bold text-white">
                                        ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className={`text-xs font-mono font-medium flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isPositive ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div className="h-16 w-full relative pointer-events-none">
                                <Sparkline 
                                    data={dataValues} 
                                    color={color} 
                                    width={300} 
                                    height={64}
                                    chartId={ticker.symbol}
                                />
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                                <span>Vol: {ticker.volume || 'N/A'}</span>
                                <span>High: {ticker.high24h ? ticker.high24h.toLocaleString(undefined, {maximumFractionDigits:0}) : '--'}</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
                );
            })}
        </div>

        {/* Detail Modal */}
        <Modal 
            isOpen={!!selectedTicker} 
            onClose={() => setSelectedTicker(null)} 
            title={selectedTicker ? `${selectedTicker.name} (${selectedTicker.symbol})` : ''}
            size="lg"
        >
            {selectedTicker && (
                <div className="space-y-6">
                    {/* Price Header */}
                    <div className="flex items-end justify-between">
                         <div>
                             <div className="text-4xl font-bold text-white font-mono">
                                 ${selectedTicker.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                             </div>
                             <div className={`flex items-center gap-2 mt-2 text-lg font-medium ${selectedTicker.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                 <span className="font-mono">{selectedTicker.change >= 0 ? '+' : ''}{selectedTicker.change.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                 <span className="bg-white/5 px-2 py-0.5 rounded text-sm font-mono">
                                     {selectedTicker.changePercent.toFixed(2)}%
                                 </span>
                             </div>
                         </div>
                         <button 
                             onClick={handleBuyFromModal}
                             className="bg-lumina-accent hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2"
                         >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                             Add to Portfolio
                         </button>
                    </div>

                    {/* Big Chart */}
                    <div className="h-64 w-full bg-black/20 rounded-xl border border-white/5 p-4">
                         <Sparkline 
                            data={selectedTicker.dataPoints.map(d => d.value)} 
                            color={selectedTicker.change >= 0 ? '#10b981' : '#ef4444'} 
                            width={800}
                            height={240}
                            chartId={`detail-${selectedTicker.symbol}`}
                        />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">24h High</div>
                            <div className="text-white font-mono text-lg">${selectedTicker.high24h?.toLocaleString() || '--'}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">24h Low</div>
                            <div className="text-white font-mono text-lg">${selectedTicker.low24h?.toLocaleString() || '--'}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Volume</div>
                            <div className="text-white font-mono text-lg">{selectedTicker.volume || '--'}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Market Cap</div>
                            <div className="text-white font-mono text-lg">${selectedTicker.marketCap || '--'}</div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    </div>
  );
};

export default Market;