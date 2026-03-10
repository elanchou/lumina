import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetType } from '../types';
import { deriveDashboardSnapshot, recalculateAssetAllocations, type AssetHistoryMap } from '../lib/dashboardData';

test('recalculateAssetAllocations distributes percentages from current value', () => {
  const result = recalculateAssetAllocations([
    {
      id: '1',
      name: 'AAPL',
      symbol: 'AAPL',
      type: AssetType.STOCK,
      quantity: 1,
      currentPrice: 120,
      value: 120,
      changePercent: 0,
      allocation: 0,
    },
    {
      id: '2',
      name: 'Cash',
      symbol: 'USD',
      type: AssetType.CASH,
      value: 80,
      changePercent: 0,
      allocation: 0,
    },
  ]);

  assert.equal(result[0].allocation, 60);
  assert.equal(result[1].allocation, 40);
});

test('deriveDashboardSnapshot calculates coverage, movers, and aggregated chart honestly', () => {
  const assets = recalculateAssetAllocations([
    {
      id: '1',
      name: 'Apple',
      symbol: 'AAPL',
      type: AssetType.STOCK,
      quantity: 1,
      currentPrice: 110,
      value: 110,
      changePercent: 10,
      allocation: 0,
    },
    {
      id: '2',
      name: 'Bitcoin',
      symbol: 'BTC-USD',
      type: AssetType.CRYPTO,
      quantity: 1,
      currentPrice: 90,
      value: 90,
      changePercent: -10,
      allocation: 0,
    },
    {
      id: '3',
      name: 'Villa',
      symbol: 'HOME',
      type: AssetType.REAL_ESTATE,
      value: 200,
      changePercent: 0,
      allocation: 0,
    },
  ]);

  const historyMap: AssetHistoryMap = {
    AAPL: [
      { date: '2026-03-01T00:00:00.000Z', close: 100, timestamp: Date.parse('2026-03-01T00:00:00.000Z'), shortLabel: 'Mar 1' },
      { date: '2026-03-02T00:00:00.000Z', close: 110, timestamp: Date.parse('2026-03-02T00:00:00.000Z'), shortLabel: 'Mar 2' },
    ],
    'BTC-USD': [
      { date: '2026-03-01T00:00:00.000Z', close: 100, timestamp: Date.parse('2026-03-01T00:00:00.000Z'), shortLabel: 'Mar 1' },
      { date: '2026-03-02T00:00:00.000Z', close: 90, timestamp: Date.parse('2026-03-02T00:00:00.000Z'), shortLabel: 'Mar 2' },
    ],
  };

  const snapshot = deriveDashboardSnapshot(assets, historyMap);

  assert.equal(snapshot.totalValue, 400);
  assert.equal(snapshot.pricedCoverageValue, 200);
  assert.equal(snapshot.pricedCoveragePercent, 50);
  assert.equal(snapshot.chartCoverageValue, 200);
  assert.equal(snapshot.chartCoveragePercent, 50);
  assert.equal(snapshot.largestPosition?.name, 'Villa');
  assert.equal(snapshot.topMover?.symbol, 'AAPL');
  assert.equal(snapshot.weakestMover?.symbol, 'BTC-USD');
  assert.equal(snapshot.chart.length, 2);
  assert.equal(snapshot.chart[0].value, 200);
  assert.equal(snapshot.chart[1].value, 200);
});

test('deriveDashboardSnapshot turns change percentages into daily pnl metrics', () => {
  const assets = recalculateAssetAllocations([
    {
      id: '1',
      name: 'NVIDIA',
      symbol: 'NVDA',
      type: AssetType.STOCK,
      quantity: 1,
      currentPrice: 110,
      value: 110,
      changePercent: 10,
      allocation: 0,
    },
  ]);

  const snapshot = deriveDashboardSnapshot(assets, {});

  assert.equal(Math.round(snapshot.dailyChangeValue), 10);
  assert.equal(Math.round(snapshot.dailyChangePercent), 10);
});
