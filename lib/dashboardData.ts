import {
  Asset,
  AssetType,
  DashboardChartPoint,
  DashboardPulse,
  DashboardSnapshot,
  DashboardStat,
  HistoricalQuotePoint,
} from '../types';

export type AssetHistoryMap = Record<string, HistoricalQuotePoint[]>;

export const MARKET_TRACKED_ASSET_TYPES = new Set<AssetType>([
  AssetType.STOCK,
  AssetType.CRYPTO,
  AssetType.FUND,
]);

const numberFormatter = new Intl.NumberFormat('en-US');

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;

const formatSignedCurrency = (value: number) => {
  const prefix = value >= 0 ? '+' : '-';
  return `${prefix}${currencyFormatter.format(Math.abs(value))}`;
};

const formatSignedPercent = (value: number) => {
  const prefix = value >= 0 ? '+' : '-';
  return `${prefix}${percentFormatter.format(Math.abs(value))}%`;
};

export const isMarketTrackedAsset = (asset: Asset) =>
  MARKET_TRACKED_ASSET_TYPES.has(asset.type) &&
  typeof asset.symbol === 'string' &&
  asset.symbol.trim().length > 0;

const hasTrackedQuantity = (asset: Asset) =>
  isMarketTrackedAsset(asset) &&
  typeof asset.quantity === 'number' &&
  Number.isFinite(asset.quantity) &&
  asset.quantity > 0;

const getAssetDayChange = (asset: Asset) => {
  const value = toFiniteNumber(asset.value);
  const percent = toFiniteNumber(asset.changePercent);

  if (value === null || percent === null || percent === 0) {
    return 0;
  }

  const divisor = 1 + percent / 100;
  if (divisor <= 0) {
    return 0;
  }

  const previousValue = value / divisor;
  return value - previousValue;
};

const getAssetHistorySeries = (asset: Asset, historyMap: AssetHistoryMap) => {
  if (!hasTrackedQuantity(asset)) return [];

  const history = historyMap[asset.symbol] ?? [];
  if (!Array.isArray(history) || history.length === 0) return [];

  return history
    .filter(point => typeof point.timestamp === 'number' && Number.isFinite(point.timestamp) && typeof point.close === 'number' && Number.isFinite(point.close))
    .map(point => ({
      ...point,
      value: point.close * (asset.quantity as number),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
};

const buildAggregatedHistory = (assets: Asset[], historyMap: AssetHistoryMap): DashboardChartPoint[] => {
  const seriesEntries = assets
    .map(asset => ({ asset, series: getAssetHistorySeries(asset, historyMap) }))
    .filter(entry => entry.series.length > 0);

  if (seriesEntries.length === 0) {
    return [];
  }

  const timestamps = Array.from(
    new Set(seriesEntries.flatMap(entry => entry.series.map(point => point.timestamp))),
  ).sort((a, b) => a - b);

  const chart: DashboardChartPoint[] = [];

  for (const timestamp of timestamps) {
    let value = 0;
    let hasAnySeries = false;

    for (const entry of seriesEntries) {
      const points = entry.series;
      let lastPoint = points[0];

      for (const point of points) {
        if (point.timestamp > timestamp) break;
        lastPoint = point;
      }

      if (lastPoint && lastPoint.timestamp <= timestamp) {
        value += lastPoint.value;
        hasAnySeries = true;
      }
    }

    if (hasAnySeries) {
      const date = new Date(timestamp);
      chart.push({
        date: date.toISOString(),
        shortLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
      });
    }
  }

  return chart.slice(-30);
};

const buildStats = (snapshot: Omit<DashboardSnapshot, 'stats' | 'pulse'>): DashboardStat[] => [
  {
    id: 'value',
    label: 'Net Asset Value',
    value: currencyFormatter.format(snapshot.totalValue),
    detail: `${snapshot.totalAssets} positions across liquid and private assets`,
    tone: 'accent',
  },
  {
    id: 'change',
    label: '24H Net Change',
    value: formatSignedCurrency(snapshot.dailyChangeValue),
    detail: formatSignedPercent(snapshot.dailyChangePercent),
    tone: snapshot.dailyChangeValue >= 0 ? 'positive' : 'negative',
  },
  {
    id: 'coverage',
    label: 'Live Market Coverage',
    value: formatPercent(snapshot.pricedCoveragePercent),
    detail: `${currencyFormatter.format(snapshot.pricedCoverageValue)} on tracked symbols`,
    tone: 'default',
  },
  {
    id: 'concentration',
    label: 'Largest Position',
    value: formatPercent(snapshot.largestPositionShare),
    detail: snapshot.largestPosition ? snapshot.largestPosition.name : 'No positions',
    tone: snapshot.largestPositionShare >= 35 ? 'warning' : 'default',
  },
];

const buildPulse = (snapshot: Omit<DashboardSnapshot, 'stats' | 'pulse'>): DashboardPulse[] => [
  {
    id: 'coverage',
    label: 'Chart Coverage',
    value: formatPercent(snapshot.chartCoveragePercent),
    detail: `${snapshot.marketTrackedAssets}/${snapshot.totalAssets} assets with usable history`,
    tone: 'accent',
  },
  {
    id: 'top',
    label: 'Best Performer',
    value: snapshot.topMover ? snapshot.topMover.symbol : '--',
    detail: snapshot.topMover ? formatSignedPercent(snapshot.topMover.changePercent) : 'Awaiting live pricing',
    tone: 'positive',
  },
  {
    id: 'worst',
    label: 'Weakest Performer',
    value: snapshot.weakestMover ? snapshot.weakestMover.symbol : '--',
    detail: snapshot.weakestMover ? formatSignedPercent(snapshot.weakestMover.changePercent) : 'Awaiting live pricing',
    tone: 'negative',
  },
];

export const recalculateAssetAllocations = (assets: Asset[]) => {
  const total = assets.reduce((sum, asset) => sum + (Number.isFinite(asset.value) ? asset.value : 0), 0);

  if (total <= 0) {
    return assets.map(asset => ({ ...asset, allocation: 0 }));
  }

  return assets.map(asset => ({
    ...asset,
    allocation: Number((((asset.value || 0) / total) * 100).toFixed(1)),
  }));
};

export const deriveDashboardSnapshot = (
  assets: Asset[],
  historyMap: AssetHistoryMap,
): DashboardSnapshot => {
  const totalValue = assets.reduce((sum, asset) => sum + (Number.isFinite(asset.value) ? asset.value : 0), 0);

  const pricedAssets = assets.filter(asset => isMarketTrackedAsset(asset) && Number.isFinite(asset.value) && asset.value > 0);
  const chartEligibleAssets = assets.filter(asset => getAssetHistorySeries(asset, historyMap).length > 0);

  const pricedCoverageValue = pricedAssets.reduce((sum, asset) => sum + asset.value, 0);
  const chartCoverageValue = chartEligibleAssets.reduce((sum, asset) => sum + asset.value, 0);
  const dailyChangeValue = assets.reduce((sum, asset) => sum + getAssetDayChange(asset), 0);
  const previousTotal = totalValue - dailyChangeValue;
  const dailyChangePercent = previousTotal > 0 ? (dailyChangeValue / previousTotal) * 100 : 0;
  const pricedCoveragePercent = totalValue > 0 ? (pricedCoverageValue / totalValue) * 100 : 0;
  const chartCoveragePercent = totalValue > 0 ? (chartCoverageValue / totalValue) * 100 : 0;

  const largestPosition = [...assets].sort((a, b) => b.value - a.value)[0] ?? null;
  const largestPositionShare = totalValue > 0 && largestPosition ? (largestPosition.value / totalValue) * 100 : 0;

  const movers = pricedAssets
    .filter(asset => Number.isFinite(asset.changePercent))
    .sort((a, b) => b.changePercent - a.changePercent);

  const baseSnapshot = {
    totalValue,
    dailyChangeValue,
    dailyChangePercent,
    pricedCoveragePercent,
    pricedCoverageValue,
    chartCoveragePercent,
    chartCoverageValue,
    marketTrackedAssets: chartEligibleAssets.length,
    totalAssets: assets.length,
    largestPositionShare,
    largestPosition,
    topMover: movers[0] ?? null,
    weakestMover: movers[movers.length - 1] ?? null,
    chart: buildAggregatedHistory(assets, historyMap),
  };

  return {
    ...baseSnapshot,
    stats: buildStats(baseSnapshot),
    pulse: buildPulse(baseSnapshot),
  };
};

export const formatCompactCurrency = (value: number) => compactCurrencyFormatter.format(value);

export const formatCount = (value: number) => numberFormatter.format(value);

export const formatDecimal = (value: number) => decimalFormatter.format(value);
