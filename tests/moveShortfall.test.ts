import { expectedCost, succeedsShort } from '../lib/moveShortfall';
import { expect } from 'chai';

describe('succeedsShort', (): void => {
  // A draw that returns each of `values` in turn and counts the calls.
  const draws = (...values: number[]) => {
    const rng = (): number => {
      rng.calls++;

      return values.shift()!;
    };

    rng.calls = 0;

    return rng;
  };

  it('should succeed when the remaining moves reach the scaled cost', (): void => {
    expect(succeedsShort(1, 3, 0.5, draws(0.5))).true; // 1 >= 0.75
    expect(succeedsShort(1, 2, 0.5, draws(1))).true; // 1 >= 1
    expect(succeedsShort(1, 3, 0.5, draws(0))).true;
  });

  it('should fail when the remaining moves fall short of the scaled cost', (): void => {
    expect(succeedsShort(1, 3, 0.5, draws(0.9))).false; // 1 < 1.35
    expect(succeedsShort(0, 3, 0.5, draws(0.1))).false;
  });

  it('should use the factor it was given', (): void => {
    expect(succeedsShort(1, 3, 0.5, draws(0.6))).true; // 1 >= 0.9
    expect(succeedsShort(1, 3, 0.6, draws(0.6))).false; // 1 < 1.08
  });

  it('should draw exactly once', (): void => {
    const rng = draws(0.5, 0.5);

    succeedsShort(1, 3, 0.5, rng);

    expect(rng.calls).equal(1);
  });

  it('should multiply in the same order as `cost * factor * rng()`', (): void => {
    // Floating point: (0.1 * 3) * 0.7 is just above 0.21 and 0.1 * (3 * 0.7) just below it.
    const remaining = 0.1 * (3 * 0.7);

    expect(succeedsShort(remaining, 0.1, 3, draws(0.7))).false;
    expect(remaining >= 0.1 * (3 * 0.7)).true;
  });
});

describe('expectedCost', (): void => {
  it('should be the full moves while success is certain', (): void => {
    expect(expectedCost(1, 2, 0.5)).equal(1);
    expect(expectedCost(3, 1, 0.5)).equal(3);
  });

  it('should be the scaled cost once success is uncertain', (): void => {
    expect(expectedCost(1, 3, 0.5)).equal(1.5);
    expect(expectedCost(1, 3, 0.4)).closeTo(1.2, 1e-12);
  });
});
