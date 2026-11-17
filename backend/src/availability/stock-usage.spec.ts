import { peakCommittedQuantity } from './stock-usage.js';

describe('peakCommittedQuantity', () => {
  it('uses peak concurrent usage instead of summing reservations on separate days', () => {
    const peak = peakCommittedQuantity('2026-11-20', '2026-11-24', [
      { start: '2026-11-20', end: '2026-11-21', quantity: 1 },
      { start: '2026-11-22', end: '2026-11-23', quantity: 2 },
    ], []);

    expect(peak).toBe(2);
  });

  it('adds reservations and unavailable stock when their dates overlap', () => {
    const peak = peakCommittedQuantity('2026-11-20', '2026-11-24', [
      { start: '2026-11-21', end: '2026-11-23', quantity: 2 },
      { start: '2026-11-23', end: '2026-11-24', quantity: 1 },
    ], [
      { start: '2026-11-22', end: '2026-11-23', quantity: 2 },
    ]);

    expect(peak).toBe(5);
  });

  it('counts an indefinite repair hold through the requested end date', () => {
    const peak = peakCommittedQuantity('2026-11-20', '2026-11-24', [], [
      { start: '2026-11-22', end: null, quantity: 3 },
    ]);

    expect(peak).toBe(3);
  });
});
