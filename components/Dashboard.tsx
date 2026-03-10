import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Asset, AssetType, DashboardSnapshot, DashboardWidget } from '../types';
import GlassCard from './GlassCard';
import Modal from './Modal';
import Sparkline from './Sparkline';
import {
  MARKET_TRACKED_ASSET_TYPES,
  compactCurrencyFormatter,
  currencyFormatter,
  formatCompactCurrency,
  recalculateAssetAllocations,
} from '../lib/dashboardData';

interface DashboardProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  widgets: DashboardWidget[];
  onRemoveWidget: (id: string) => void;
  snapshot: DashboardSnapshot;
}

const COLORS = {
  [AssetType.CASH]: '#7dd3fc',
  [AssetType.STOCK]: '#38bdf8',
  [AssetType.CRYPTO]: '#2dd4bf',
  [AssetType.REAL_ESTATE]: '#818cf8',
  [AssetType.METAL]: '#fbbf24',
  [AssetType.COLLECTIBLE]: '#f472b6',
  [AssetType.FUND]: '#34d399',
  [AssetType.OTHER]: '#94a3b8',
};

const toneClasses: Record<string, string> = {
  default: 'text-slate-200',
  accent: 'text-cyan-200',
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
  warning: 'text-amber-300',
};

const Dashboard: React.FC<DashboardProps> = ({ assets, setAssets, widgets, onRemoveWidget, snapshot }) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    type: AssetType.STOCK,
    quantity: 1,
  });

  const allocationData = useMemo(
    () => assets.filter(asset => asset.value > 0).map(asset => ({ name: asset.name, value: asset.value, type: asset.type })),
    [assets],
  );

  const handleAddAsset = () => {
    const name = newAsset.name?.trim();
    const type = newAsset.type || AssetType.OTHER;
    const value = typeof newAsset.value === 'number' ? newAsset.value : NaN;

    if (!name || !Number.isFinite(value) || value <= 0) {
      return;
    }

    const explicitQuantity =
      typeof newAsset.quantity === 'number' && Number.isFinite(newAsset.quantity) && newAsset.quantity > 0
        ? newAsset.quantity
        : undefined;
    const quantity = MARKET_TRACKED_ASSET_TYPES.has(type) ? explicitQuantity ?? 1 : explicitQuantity;
    const symbol = (newAsset.symbol || name.slice(0, 5)).trim().toUpperCase();
    const currentPrice = quantity ? value / quantity : undefined;

    const assetToAdd: Asset = {
      id: Date.now().toString(),
      name,
      symbol,
      type,
      value,
      quantity,
      currentPrice,
      changePercent: 0,
      allocation: 0,
    };

    setAssets(prev => recalculateAssetAllocations([...prev, assetToAdd]));
    setNewAsset({ type: AssetType.STOCK, quantity: 1 });
    setIsManageModalOpen(false);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(prev => recalculateAssetAllocations(prev.filter(asset => asset.id !== id)));
  };

  const renderWidget = (widget: DashboardWidget) => {
    const tone = toneClasses[widget.visualStyle || 'default'] || toneClasses.default;

    return (
      <GlassCard key={widget.id} className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{widget.title}</div>
            {widget.subTitle && <div className="mt-1 text-xs text-slate-400">{widget.subTitle}</div>}
          </div>
          <button
            onClick={() => onRemoveWidget(widget.id)}
            className="icon-button icon-button-small"
            aria-label={`Remove ${widget.title}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {widget.type === 'metric' && (
          <div className={`mt-5 text-2xl font-semibold ${tone}`}>{widget.data.value}</div>
        )}

        {widget.type === 'chart' && (
          <div className="mt-5 h-20 w-full">
            <Sparkline data={widget.data.values || []} color="#38bdf8" chartId={widget.id} />
          </div>
        )}

        {widget.type === 'insight' && (
          <p className="mt-5 text-sm leading-6 text-slate-300">{widget.data.value}</p>
        )}
      </GlassCard>
    );
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <GlassCard className="panel-grid p-6 md:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="panel-badge panel-badge-cyan">Command Center</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                  Portfolio telemetry with honest market coverage.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  Total net worth includes every asset you track. Live metrics and historical curves are driven only by
                  assets with real market pricing, so the dashboard stays credible instead of fabricating movement.
                </p>
              </div>

              <div className="min-w-[220px] rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Net Asset Value</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {currencyFormatter.format(snapshot.totalValue)}
                </div>
                <div className={`mt-3 text-sm font-medium ${snapshot.dailyChangeValue >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {snapshot.dailyChangeValue >= 0 ? '+' : '-'}
                  {compactCurrencyFormatter.format(Math.abs(snapshot.dailyChangeValue))} today
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {snapshot.stats.map(stat => (
                <div key={stat.id} className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{stat.label}</div>
                  <div className={`mt-3 text-2xl font-semibold ${toneClasses[stat.tone || 'default']}`}>
                    {stat.value}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">{stat.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Market Pulse</div>
              <div className="mt-1 text-xl font-semibold text-white">Coverage + movers</div>
            </div>
            <div className="panel-badge">{snapshot.chart.length > 0 ? 'Live curve' : 'History pending'}</div>
          </div>

          <div className="mt-6 space-y-3">
            {snapshot.pulse.map(item => (
              <div key={item.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-400">{item.label}</div>
                  <div className={`text-sm font-semibold ${toneClasses[item.tone || 'default']}`}>{item.value}</div>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[22px] border border-white/8 bg-black/25 p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Largest position</div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">
                  {snapshot.largestPosition?.name || 'No positions'}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {snapshot.largestPosition ? snapshot.largestPosition.symbol : '--'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-white">
                  {snapshot.largestPosition ? formatCompactCurrency(snapshot.largestPosition.value) : '--'}
                </div>
                <div className="mt-1 text-xs text-slate-500">{snapshot.largestPositionShare.toFixed(1)}% of portfolio</div>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_400px]">
        <GlassCard className="panel-grid min-h-[430px] p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Historical Value</div>
                <div className="mt-1 text-2xl font-semibold text-white">Tracked market assets over the last 30 days</div>
              </div>
              <div className="panel-badge panel-badge-cyan">
                {snapshot.chartCoveragePercent.toFixed(0)}% of portfolio has usable history
              </div>
            </div>

            <div className="h-[320px] w-full">
              {snapshot.chart.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshot.chart} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardValueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="shortLabel" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={value => formatCompactCurrency(value)} />
                    <Tooltip
                      cursor={{ stroke: 'rgba(56,189,248,0.25)', strokeWidth: 1 }}
                      contentStyle={{
                        background: 'rgba(6, 10, 18, 0.96)',
                        border: '1px solid rgba(148,163,184,0.16)',
                        borderRadius: '16px',
                        boxShadow: '0 24px 60px rgba(2, 6, 23, 0.55)',
                      }}
                      formatter={(value: number) => [currencyFormatter.format(value), 'Tracked value']}
                      labelFormatter={(label: string) => `As of ${label}`}
                    />
                    <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2.5} fill="url(#dashboardValueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart-state">
                  <div className="panel-badge">No history yet</div>
                  <div className="mt-4 text-xl font-semibold text-white">Live historical aggregation needs more tracked symbols.</div>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                    Add stocks, crypto, funds, or metals with a quantity to activate the 30-day curve. Private holdings
                    still remain inside total net worth and allocation views.
                  </p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Diversification</div>
                <div className="mt-1 text-xl font-semibold text-white">Allocation footprint</div>
              </div>
              <div className="panel-badge">{assets.length} assets</div>
            </div>

            <div className="relative mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocationData} innerRadius={72} outerRadius={96} paddingAngle={4} dataKey="value" stroke="none">
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.type as AssetType] || '#38bdf8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(6, 10, 18, 0.96)',
                      border: '1px solid rgba(148,163,184,0.16)',
                      borderRadius: '16px',
                    }}
                    formatter={(value: number) => [currencyFormatter.format(value), 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total net worth</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatCompactCurrency(snapshot.totalValue)}</div>
                <div className="mt-2 text-xs text-slate-400">{snapshot.pricedCoveragePercent.toFixed(0)}% live-priced coverage</div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {assets.map(asset => (
                <div key={asset.id} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[asset.type] }} />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{asset.name}</span>
                  <span className="font-mono text-slate-400">{asset.allocation.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {widgets.length > 0 && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Adaptive Widgets</div>
                  <div className="mt-1 text-xl font-semibold text-white">AI-created overlays</div>
                </div>
                <div className="panel-badge panel-badge-cyan">{widgets.length} active</div>
              </div>
              <div className="mt-5 grid gap-4">
                {widgets.map(renderWidget)}
              </div>
            </GlassCard>
          )}
        </div>
      </section>

      <GlassCard className="overflow-hidden">
        <div className="panel-header border-b border-white/8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Holdings</div>
            <div className="mt-1 text-xl font-semibold text-white">Portfolio inventory</div>
          </div>
          <button onClick={() => setIsManageModalOpen(true)} className="btn-primary">
            Manage portfolio
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="terminal-table w-full min-w-[760px] text-left">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th className="text-right">Price</th>
                <th className="text-right">Value</th>
                <th className="text-right">24h</th>
                <th className="text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => {
                const liveBadge = MARKET_TRACKED_ASSET_TYPES.has(asset.type) ? 'Live' : 'Manual';
                return (
                  <tr key={asset.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[asset.type] }} />
                        <div>
                          <div className="font-medium text-white">{asset.name}</div>
                          <div className="text-xs text-slate-500">{asset.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {liveBadge}
                      </span>
                    </td>
                    <td className="text-right font-mono text-slate-300">
                      {typeof asset.currentPrice === 'number' ? currencyFormatter.format(asset.currentPrice) : '--'}
                    </td>
                    <td className="text-right font-mono text-white">{currencyFormatter.format(asset.value)}</td>
                    <td className={`text-right font-mono ${asset.changePercent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {asset.changePercent >= 0 ? '+' : ''}
                      {asset.changePercent.toFixed(2)}%
                    </td>
                    <td className="text-right">
                      <div className="ml-auto flex w-24 items-center justify-end gap-3">
                        <span className="font-mono text-slate-300">{asset.allocation.toFixed(1)}%</span>
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-cyan-300" style={{ width: `${asset.allocation}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="Portfolio Registry" size="lg">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Register an asset</div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Asset Name"
                className="field-shell"
                value={newAsset.name || ''}
                onChange={event => setNewAsset({ ...newAsset, name: event.target.value })}
              />
              <input
                type="text"
                placeholder="Symbol"
                className="field-shell"
                value={newAsset.symbol || ''}
                onChange={event => setNewAsset({ ...newAsset, symbol: event.target.value.toUpperCase() })}
              />
              <select
                className="field-shell"
                value={newAsset.type}
                onChange={event => setNewAsset({ ...newAsset, type: event.target.value as AssetType })}
              >
                {Object.values(AssetType).map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Est. Value"
                className="field-shell"
                value={newAsset.value || ''}
                onChange={event => setNewAsset({ ...newAsset, value: parseFloat(event.target.value) })}
              />
              <input
                type="number"
                min="0"
                step="0.0001"
                placeholder="Quantity"
                className="field-shell md:col-span-2 xl:col-span-2"
                value={newAsset.quantity || ''}
                onChange={event => setNewAsset({ ...newAsset, quantity: parseFloat(event.target.value) })}
              />
              <div className="md:col-span-2 xl:col-span-2 flex items-center rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                Trackable assets default to quantity 1 if you only enter a total value.
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={handleAddAsset} className="btn-primary">
                Add to portfolio
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-black/25 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                    {asset.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-white">{asset.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {asset.type} · {currencyFormatter.format(asset.value)}
                    </div>
                  </div>
                </div>

                <button onClick={() => handleRemoveAsset(asset.id)} className="btn-danger">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
