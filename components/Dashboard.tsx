
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ assets, setAssets, widgets, onRemoveWidget }) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  // Form state
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ type: AssetType.STOCK, allocation: 0, changePercent: 0 });

  const totalValue = useMemo(() => assets.reduce((sum, asset) => sum + asset.value, 0), [assets]);
  
  // Generate fake chart history based on current total
  const dataHistory = useMemo(() => [
    { name: '09:00', value: totalValue * 0.98 },
    { name: '10:00', value: totalValue * 0.985 },
    { name: '11:00', value: totalValue * 0.99 },
    { name: '12:00', value: totalValue * 1.005 },
    { name: '13:00', value: totalValue * 1.01 },
    { name: '14:00', value: totalValue },
  ], [totalValue]);

  const allocationData = useMemo(() => {
    return assets.map(a => ({ name: a.name, value: a.value }));
  }, [assets]);

  const handleAddAsset = () => {
      if (!newAsset.name || !newAsset.value || !newAsset.symbol) return;
      
      const assetToAdd: Asset = {
          id: Date.now().toString(),
          name: newAsset.name,
          symbol: newAsset.symbol.toUpperCase(),
          type: newAsset.type || AssetType.STOCK,
          value: Number(newAsset.value),
          changePercent: (Math.random() * 4) - 2, // Random change for demo
          allocation: 0 // Will recalculate below
      };

      const updatedAssets = [...assets, assetToAdd];
      // Recalculate allocations
      const newTotal = updatedAssets.reduce((sum, a) => sum + a.value, 0);
      const finalAssets = updatedAssets.map(a => ({
          ...a,
          allocation: parseFloat(((a.value / newTotal) * 100).toFixed(1))
      }));
      
      setAssets(finalAssets);
      setNewAsset({ type: AssetType.STOCK, allocation: 0, changePercent: 0, name: '', symbol: '', value: 0 });
  };

  const handleDeleteAsset = (id: string) => {
      const updatedAssets = assets.filter(a => a.id !== id);
      // Recalculate allocations
      const newTotal = updatedAssets.reduce((sum, a) => sum + a.value, 0);
      const finalAssets = updatedAssets.map(a => ({
          ...a,
          allocation: parseFloat(((a.value / newTotal) * 100).toFixed(1))
      }));
      setAssets(finalAssets);
  };

  const renderWidget = (widget: DashboardWidget) => {
      const isMetric = widget.type === 'metric';
      const isChart = widget.type === 'chart';
      const isInsight = widget.type === 'insight';

      let visualClass = 'text-white';
      if (widget.visualStyle === 'success') visualClass = 'text-emerald-400';
      if (widget.visualStyle === 'danger') visualClass = 'text-red-400';
      if (widget.visualStyle === 'warning') visualClass = 'text-amber-400';
      if (widget.visualStyle === 'accent') visualClass = 'text-lumina-accent';

      let bgClass = '';
      if (widget.visualStyle === 'accent') bgClass = 'border-l-4 border-l-lumina-accent';

      return (
          <GlassCard key={widget.id} className={`p-5 relative group ${bgClass}`}>
              <button 
                  onClick={() => onRemoveWidget(widget.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                  title="Remove Widget"
              >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>

              <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">{widget.title}</h3>
              
              {isMetric && (
                  <>
                    <div className={`text-3xl font-bold tracking-tight font-mono ${visualClass}`}>
                        {typeof widget.data.value === 'string' ? widget.data.value : widget.data.value.toLocaleString()}
                    </div>
                    {widget.data.trend && (
                         <div className="text-lumina-success text-xs mt-2 flex items-center font-mono">
                             <span className={`bg-white/10 px-1.5 py-0.5 rounded ${widget.data.trend.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                                 {widget.data.trend}
                             </span>
                         </div>
                    )}
                    <div className="text-gray-500 text-xs mt-2">
                        {widget.subTitle}
                    </div>
                  </>
              )}

              {isChart && (
                  <div className="h-full flex flex-col">
                      <div className="text-2xl font-bold text-white font-mono mb-2">
                          {widget.subTitle}
                      </div>
                      <div className="flex-1 min-h-[60px] w-full">
                          <Sparkline 
                            data={widget.data.values || [0]} 
                            color={widget.visualStyle === 'success' ? '#10b981' : '#3b82f6'} 
                            chartId={widget.id}
                          />
                      </div>
                  </div>
              )}

              {isInsight && (
                   <div>
                       <p className="text-sm text-gray-300 leading-relaxed mt-2">
                           {typeof widget.data.value === 'string' ? widget.data.value : ''}
                       </p>
                       <div className="text-[10px] text-blue-400 mt-3 uppercase tracking-wider font-semibold">
                           AI Generated Insight
                       </div>
                   </div>
              )}
          </GlassCard>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Dynamic Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map(renderWidget)}
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[420px]">
        <GlassCard className="lg:col-span-2 p-6 flex flex-col min-h-[350px] lg:min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Portfolio Performance</h3>
            <div className="flex gap-2">
                {['1D', '1W', '1M', 'YTD', 'ALL'].map(p => (
                    <button key={p} className={`text-xs px-2 py-1 rounded ${p === '1D' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{p}</button>
                ))}
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" tick={{fill: '#64748b', fontSize: 10}} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" tick={{fill: '#64748b', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', color: '#fff', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                    itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-1 p-6 flex flex-col min-h-[350px] lg:min-h-0">
          <h3 className="text-white font-semibold mb-2">Allocation</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px', fontFamily: '"Plus Jakarta Sans", sans-serif' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <div className="text-xs text-gray-500">Total Assets</div>
                    <div className="text-lg font-bold text-white font-mono">{assets.length}</div>
                </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
             {assets.map((asset, index) => (
              <div key={asset.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-gray-300">{asset.name}</span>
                </div>
                <span className="text-gray-400 font-mono">{asset.allocation}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Positions Table */}
      <GlassCard className="overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-border flex justify-between items-center">
            <h3 className="text-white font-semibold">Active Positions</h3>
            <button 
              onClick={() => setIsManageModalOpen(true)}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              Manage Positions
            </button>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-medium">Instrument</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium text-right">Market Value</th>
                <th className="px-6 py-3 font-medium text-right">Unrealized P&L</th>
                <th className="px-6 py-3 font-medium text-right">Allocation</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 text-sm divide-y divide-glass-border">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-medium text-white group-hover:text-lumina-accent transition-colors">{asset.name} <span className="text-gray-500 text-xs ml-1">({asset.symbol})</span></td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] border border-white/10 bg-white/5 text-gray-400">
                      {asset.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">${asset.value.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-right font-mono ${asset.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="w-16 ml-auto bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-lumina-accent h-full" style={{ width: `${asset.allocation}%` }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Manage Positions Modal */}
      <Modal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)}
        title="Manage Portfolio Positions"
      >
        <div className="space-y-8">
          {/* Add Asset Form */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Add New Asset</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <input 
                type="text" 
                placeholder="Symbol (e.g. GOOG)"
                className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-lumina-accent outline-none"
                value={newAsset.symbol}
                onChange={e => setNewAsset({...newAsset, symbol: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Name"
                className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-lumina-accent outline-none"
                value={newAsset.name}
                onChange={e => setNewAsset({...newAsset, name: e.target.value})}
              />
              <select
                className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 focus:border-lumina-accent outline-none"
                value={newAsset.type}
                onChange={e => setNewAsset({...newAsset, type: e.target.value as AssetType})}
              >
                {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input 
                type="number" 
                placeholder="Value ($)"
                className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-lumina-accent outline-none"
                value={newAsset.value || ''}
                onChange={e => setNewAsset({...newAsset, value: parseFloat(e.target.value)})}
              />
              <button 
                onClick={handleAddAsset}
                className="bg-lumina-accent hover:bg-blue-600 text-white rounded px-3 py-2 text-sm font-medium transition-colors"
              >
                Add Position
              </button>
            </div>
          </div>

          {/* Edit List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Current Holdings</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {assets.map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-white/20 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {asset.symbol[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{asset.name}</div>
                        <div className="text-xs text-gray-500">{asset.symbol} • {asset.type}</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-mono text-white">${asset.value.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 font-mono">{asset.allocation}% Alloc</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
