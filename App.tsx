import React, { useEffect, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ViewState, Asset, AssetType, DashboardWidget, HistoricalQuotePoint } from './types';
import { MOCK_ASSETS } from './constants';
import Dashboard from './components/Dashboard';
import Market from './components/Market';
import ChatInterface from './components/ChatInterface';
import Analysis from './components/Analysis';
import Modal from './components/Modal';
import {
  AssetHistoryMap,
  compactCurrencyFormatter,
  deriveDashboardSnapshot,
  isMarketTrackedAsset,
  recalculateAssetAllocations,
} from './lib/dashboardData';

const hydrateStoredAssets = (rawAssets: Asset[]) =>
  rawAssets.map(asset => {
    if (asset.type === AssetType.METAL && asset.name === 'Physical Gold') {
      const quantity =
        typeof asset.quantity === 'number' && Number.isFinite(asset.quantity) && asset.quantity > 0
          ? asset.quantity
          : 16;
      const currentPrice =
        typeof asset.currentPrice === 'number' && Number.isFinite(asset.currentPrice) && asset.currentPrice > 1
          ? asset.currentPrice
          : 2000;
      const value =
        typeof asset.value === 'number' && Number.isFinite(asset.value) && asset.value > 1
          ? asset.value
          : currentPrice * quantity;

      return {
        ...asset,
        symbol: 'GOLD',
        quantity,
        currentPrice,
        value,
      };
    }

    return asset;
  });

const normalizeHistoryPayload = (payload: unknown): HistoricalQuotePoint[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((row: any) => {
      if (!row?.date || typeof row.close !== 'number' || !Number.isFinite(row.close)) {
        return null;
      }

      const timestamp = typeof row.timestamp === 'number'
        ? row.timestamp
        : new Date(row.date).getTime();

      if (!Number.isFinite(timestamp)) {
        return null;
      }

      return {
        date: new Date(timestamp).toISOString(),
        close: row.close,
        timestamp,
        shortLabel: row.shortLabel || new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      } satisfies HistoricalQuotePoint;
    })
    .filter((row): row is HistoricalQuotePoint => row !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState | 'chat'>('dashboard');
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('nexus_assets');
    if (saved) {
      try {
        return recalculateAssetAllocations(hydrateStoredAssets(JSON.parse(saved)));
      } catch (_error) {
        return recalculateAssetAllocations(MOCK_ASSETS);
      }
    }
    return recalculateAssetAllocations(MOCK_ASSETS);
  });
  const [assetHistory, setAssetHistory] = useState<AssetHistoryMap>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('nexus_widgets');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(widget => !String(widget?.id).startsWith('default-')) : [];
    } catch (_error) {
      return [];
    }
  });
  const [settings, setSettings] = useState({
    notifications: true,
    currency: 'USD',
    theme: 'Dark',
    highContrast: false,
  });

  const trackedSymbols = useMemo(
    () =>
      Array.from(
        new Set(
          assets
            .filter(isMarketTrackedAsset)
            .map(asset => asset.symbol.trim().toUpperCase()),
        ),
      ),
    [assets],
  );

  const trackedSymbolsKey = trackedSymbols.join(',');

  const dashboardSnapshot = useMemo(
    () => deriveDashboardSnapshot(assets, assetHistory),
    [assets, assetHistory],
  );

  useEffect(() => {
    localStorage.setItem('nexus_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('nexus_widgets', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    if (!trackedSymbolsKey) {
      return;
    }

    let cancelled = false;

    const fetchAssetPrices = async () => {
      try {
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(trackedSymbolsKey)}`);
        if (!res.ok) return;

        const payload = await res.json();
        const quotes = Array.isArray(payload) ? payload : [payload];
        const quoteMap = new Map(
          quotes
            .filter((quote: any) => quote?.symbol && typeof quote.regularMarketPrice === 'number')
            .map((quote: any) => [String(quote.symbol).toUpperCase(), quote]),
        );

        if (cancelled || quoteMap.size === 0) {
          return;
        }

        setAssets(prevAssets => {
          let changed = false;

          const updatedAssets = prevAssets.map(asset => {
            if (!isMarketTrackedAsset(asset)) {
              return asset;
            }

            const quote = quoteMap.get(asset.symbol.toUpperCase());
            if (!quote) {
              return asset;
            }

            const quantity =
              typeof asset.quantity === 'number' && Number.isFinite(asset.quantity) && asset.quantity > 0
                ? asset.quantity
                : 1;
            const nextPrice = quote.regularMarketPrice;
            const nextValue = nextPrice * quantity;
            const nextChangePercent =
              typeof quote.regularMarketChangePercent === 'number' && Number.isFinite(quote.regularMarketChangePercent)
                ? quote.regularMarketChangePercent
                : asset.changePercent;

            if (
              asset.currentPrice === nextPrice &&
              asset.value === nextValue &&
              asset.changePercent === nextChangePercent &&
              asset.quantity === quantity
            ) {
              return asset;
            }

            changed = true;

            return {
              ...asset,
              quantity,
              currentPrice: nextPrice,
              value: nextValue,
              changePercent: nextChangePercent,
            };
          });

          return changed ? recalculateAssetAllocations(updatedAssets) : prevAssets;
        });
      } catch (error) {
        console.error('Failed to fetch asset prices', error);
      }
    };

    void fetchAssetPrices();
    const interval = window.setInterval(() => {
      void fetchAssetPrices();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trackedSymbolsKey]);

  useEffect(() => {
    const activeSymbols = trackedSymbols;
    if (activeSymbols.length === 0) {
      setAssetHistory({});
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      const results = await Promise.all(
        activeSymbols.map(async symbol => {
          try {
            const res = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}`);
            if (!res.ok) {
              return [symbol, []] as const;
            }

            const payload = await res.json();
            return [symbol, normalizeHistoryPayload(payload)] as const;
          } catch (error) {
            console.error(`Failed to fetch history for ${symbol}`, error);
            return [symbol, []] as const;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setAssetHistory(() => {
        const nextHistory: AssetHistoryMap = {};
        results.forEach(([symbol, history]) => {
          if (history.length > 0) {
            nextHistory[symbol] = history;
          }
        });
        return nextHistory;
      });
    };

    void fetchHistory();
    const interval = window.setInterval(() => {
      void fetchHistory();
    }, 120000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trackedSymbolsKey]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleAddWidget = (widget: DashboardWidget) => {
    setWidgets(prev => [...prev, widget]);
    showToast(`Added "${widget.title}" to Dashboard`, 'success');
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id));
  };

  const handleAddToPortfolio = (symbol: string, name: string, price: number, type: AssetType) => {
    const quantity = type === AssetType.CRYPTO ? 0.5 : 10;
    const newAsset: Asset = {
      id: Date.now().toString(),
      name,
      symbol,
      type,
      quantity,
      currentPrice: price,
      value: price * quantity,
      changePercent: 0,
      allocation: 0,
    };

    setAssets(prev => recalculateAssetAllocations([...prev, newAsset]));
    showToast(`Added ${symbol} to Portfolio`, 'success');
  };

  return (
    <div className="app-shell min-h-screen h-[100dvh] w-full overflow-hidden text-slate-100">
      <div className="app-atmosphere" />

      {toast && (
        <div className="fixed top-20 right-4 md:right-8 z-[70] animate-fade-in max-w-[90vw]">
          <div className={`status-toast ${toast.type === 'success' ? 'status-toast-success' : 'status-toast-info'}`}>
            <span className={`status-dot ${toast.type === 'success' ? 'status-dot-success' : 'status-dot-info'}`} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050913]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="group flex items-center gap-4 text-left"
            >
              <div className="brand-mark">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.45em] text-cyan-300/75">Lumina</div>
                <h1 className="text-xl font-semibold tracking-tight text-white">Private Asset Terminal</h1>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="status-dot status-dot-success" />
              <div className="text-xs text-slate-300">
                Live coverage {dashboardSnapshot.chartCoveragePercent.toFixed(0)}%
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {[
              ['dashboard', 'Dashboard'],
              ['market', 'Market'],
              ['analysis', 'Analysis'],
              ['chat', 'AI Desk'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as ViewState | 'chat')}
                className={`app-tab ${activeTab === key ? 'app-tab-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden xl:block text-right">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Net Asset Value</div>
              <div className="font-mono text-lg font-semibold text-white">
                {compactCurrencyFormatter.format(dashboardSnapshot.totalValue)}
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="icon-button"
              aria-label="Open settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-slate-900 to-slate-800 text-sm font-semibold text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
              LU
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex h-[calc(100dvh-5rem)] max-w-[1600px] w-full gap-6 overflow-hidden px-4 py-6 md:px-6">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-0 md:pr-1">
            {activeTab === 'dashboard' && (
              <Dashboard
                assets={assets}
                setAssets={setAssets}
                widgets={widgets}
                onRemoveWidget={handleRemoveWidget}
                snapshot={dashboardSnapshot}
              />
            )}
            {activeTab === 'market' && <Market onAddToPortfolio={handleAddToPortfolio} />}
            {activeTab === 'analysis' && <Analysis assets={assets} />}
            {activeTab === 'chat' && (
              <div className="panel-surface panel-surface-strong h-full min-h-[680px] overflow-hidden">
                <ChatInterface assets={assets} onAddWidget={handleAddWidget} />
              </div>
            )}
          </div>
        </section>

        <aside className="hidden xl:flex w-[360px] flex-shrink-0 flex-col gap-5">
          <div className="panel-surface panel-surface-strong flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="panel-header">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">AI Desk</div>
                <div className="text-lg font-semibold text-white">Lumina Analyst</div>
              </div>
              <div className="panel-badge">online</div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatInterface assets={assets} onAddWidget={handleAddWidget} />
            </div>
          </div>

          <div className="panel-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Coverage</div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {dashboardSnapshot.marketTrackedAssets}/{dashboardSnapshot.totalAssets}
                </div>
              </div>
              <div className="panel-badge panel-badge-cyan">
                {dashboardSnapshot.chart.length > 0 ? 'History Live' : 'Awaiting data'}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              The command center prioritizes liquid assets with live pricing while still carrying private holdings
              in total net worth and diversification views.
            </p>
          </div>
        </aside>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/8 bg-[#060a12]/90 px-4 py-3 backdrop-blur-xl md:hidden">
        {[
          ['dashboard', 'Home'],
          ['market', 'Market'],
          ['analysis', 'Risk'],
          ['chat', 'AI'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as ViewState | 'chat')}
            className={`flex min-w-[64px] flex-col items-center gap-1 text-xs ${activeTab === key ? 'text-cyan-300' : 'text-slate-500'}`}
          >
            <span className="h-1 w-1 rounded-full bg-current" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Platform Settings"
        size="sm"
      >
        <div className="space-y-6">
          <div className="settings-row">
            <div>
              <div className="settings-title">Notifications</div>
              <div className="settings-note">Receive alerts for price movements</div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
              className={`toggle-shell ${settings.notifications ? 'toggle-shell-active' : ''}`}
            >
              <span className={`toggle-knob ${settings.notifications ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-title">Display Currency</div>
              <div className="settings-note">Base currency for portfolio</div>
            </div>
            <select
              value={settings.currency}
              onChange={event => setSettings({ ...settings, currency: event.target.value })}
              className="field-shell min-w-[110px]"
            >
              <option>USD</option>
              <option>EUR</option>
              <option>JPY</option>
            </select>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-title">Visual Mode</div>
              <div className="settings-note">Current theme stays in dark terminal mode</div>
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-black/30 p-1">
              <button className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">Dark</button>
              <button className="px-3 py-1 text-xs text-slate-500">Light</button>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/6 p-4 text-sm text-cyan-100">
            Lumina Terminal v2.0
            <div className="mt-1 text-xs text-cyan-200/70">
              Real market routes, honest chart coverage, and refreshed command-center styling.
            </div>
          </div>
        </div>
      </Modal>

      <Analytics />
    </div>
  );
};

export default App;
