
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Asset, AssetType, DashboardWidget } from '../types';
import GlassCard from './GlassCard';
import Modal from './Modal';
import Sparkline from './Sparkline';

interface DashboardProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  widgets: DashboardWidget[];
  onRemoveWidget: (id: string) => void;
}

const COLORS = {
  [AssetType.CASH]: '#94a3b8',
  [AssetType.STOCK]: '#3b82f6',
  [AssetType.CRYPTO]: '#f59e0b',
  [AssetType.REAL_ESTATE]: '#8b5cf6',
  [AssetType.METAL]: '#fbbf24',
  [AssetType.COLLECTIBLE]: '#ec4899',
  [AssetType.FUND]: '#10b981',
  [AssetType.OTHER]: '#64748b'
};

const Dashboard: React.FC<DashboardProps> = ({ assets, setAssets, widgets, onRemoveWidget }) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ type: AssetType.STOCK });

  const totalValue = useMemo(() => assets.reduce((sum, asset) => sum + asset.value, 0), [assets]);
  
  const dataHistory = useMemo(() => [
    { name: 'Jan', value: totalValue * 0.92 },
    { name: 'Feb', value: totalValue * 0.94 },
    { name: 'Mar', value: totalValue * 0.93 },
    { name: 'Apr', value: totalValue * 0.97 },
    { name: 'May', value: totalValue * 0.99 },
    { name: 'Jun', value: totalValue },
  ], [totalValue]);

  const allocationData = useMemo(() => {
    return assets.map(a => ({ name: a.name, value: a.value, type: a.type }));
  }, [assets]);

  const handleAddAsset = () => {
      if (!newAsset.name || !newAsset.value) return;
      const assetToAdd: Asset = {
          id: Date.now().toString(),
          name: newAsset.name,
          symbol: (newAsset.symbol || newAsset.name.substring(0, 4)).toUpperCase(),
          type: newAsset.type || AssetType.OTHER,
          value: Number(newAsset.value),
          changePercent: 0,
          allocation: 0
      };
      const updated = [...assets, assetToAdd];
      const newTotal = updated.reduce((s, a) => s + a.value, 0);
      setAssets(updated.map(a => ({ ...a, allocation: parseFloat(((a.value / newTotal) * 100).toFixed(1)) })));
      setNewAsset({ type: AssetType.STOCK });
  };

  const renderWidget = (widget: DashboardWidget) => {
      const visualClass = widget.visualStyle === 'success' ? 'text-emerald-400' : 
                          widget.visualStyle === 'danger' ? 'text-red-400' :
                          widget.visualStyle === 'accent' ? 'text-nexus-accent' : 'text-white';

      return (
          <GlassCard key={widget.id} className="p-5 relative group border-l-4" style={{ borderLeftColor: widget.visualStyle === 'accent' ? '#3b82f6' : 'transparent' }}>
              <button onClick={() => onRemoveWidget(widget.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">{widget.title}</h3>
              {widget.type === 'metric' && (
                  <div>
                    <div className={`text-2xl font-bold font-mono ${visualClass}`}>{widget.data.value}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{widget.subTitle}</div>
                  </div>
              )}
              {widget.type === 'chart' && (
                  <div className="h-20 w-full mt-2">
                      <Sparkline data={widget.data.values || []} color="#3b82f6" chartId={widget.id} />
                  </div>
              )}
              {widget.type === 'insight' && (
                  <p className="text-xs text-gray-400 leading-relaxed mt-2 line-clamp-3">{widget.data.value}</p>
              )}
          </GlassCard>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {widgets.map(renderWidget)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-bold tracking-tight">Portfolio Growth</h3>
            <div className="text-xs text-nexus-accent font-mono bg-blue-500/10 px-2 py-1 rounded">Global Asset Trend</div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col min-h-[350px]">
          <h3 className="text-white font-bold mb-4">Diversification</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.type as AssetType] || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-gray-500 uppercase">Total Net</span>
                <span className="text-sm font-bold text-white font-mono">${(totalValue/1000).toFixed(0)}k</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
             {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[asset.type] }}></span>
                <span className="text-gray-400 truncate">{asset.name}</span>
                <span className="text-white ml-auto font-mono">{asset.allocation}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h3 className="text-white font-bold text-sm tracking-tight">Asset Inventory</h3>
            <button onClick={() => setIsManageModalOpen(true)} className="text-[10px] bg-nexus-accent text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors uppercase font-bold tracking-wider">Modify Portfolio</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-500 uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-bold">Asset Name</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 text-right font-bold">Current Value</th>
                <th className="px-6 py-4 text-right font-bold">Portfolio Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">{asset.name} <span className="text-[10px] text-gray-600 ml-1">({asset.symbol})</span></td>
                  <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400 text-[9px]">{asset.type}</span></td>
                  <td className="px-6 py-4 text-right font-mono text-white">${asset.value.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right"><div className="w-12 h-1 bg-gray-800 rounded-full ml-auto overflow-hidden"><div className="h-full bg-nexus-accent" style={{ width: `${asset.allocation}%` }}></div></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="Wealth Management">
        <div className="space-y-6">
          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Register New Asset</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Asset Name" className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-nexus-accent" value={newAsset.name || ''} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
              <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-nexus-accent" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value as AssetType})}>
                {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" placeholder="Est. Value ($)" className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-nexus-accent" value={newAsset.value || ''} onChange={e => setNewAsset({...newAsset, value: parseFloat(e.target.value)})} />
              <button onClick={handleAddAsset} className="sm:col-span-2 lg:col-span-3 bg-nexus-accent hover:bg-blue-600 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg shadow-blue-500/20">Add to Global Portfolio</button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {assets.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-gray-500 border border-white/5">{a.type[0]}</div>
                      <div><div className="text-sm font-bold text-white">{a.name}</div><div className="text-[10px] text-gray-500">{a.type}</div></div>
                   </div>
                   <button onClick={() => setAssets(assets.filter(item => item.id !== a.id))} className="text-gray-600 hover:text-red-400 p-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
