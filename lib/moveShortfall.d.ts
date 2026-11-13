/**
 * A unit short of the moves a step costs (`remaining < cost`) gets there when its remaining moves reach `factor` of the
 * cost, scaled by one random draw: always with at least `cost × factor` left, otherwise with a chance of
 * `remaining / (cost × factor)`. `rng` is called once.
 */
export declare const succeedsShort: (
  remaining: number,
  cost: number,
  factor: number,
  rng: () => number
) => boolean;
/**
 * What a step costing `cost` is worth on average to a unit with `movement` moves a turn, when it may be short of them
 * (`succeedsShort`) and each attempt spends the turn: `max(movement, cost × factor)`. One turn while success is
 * certain, `1 / chance` turns after that.
 */
export declare const expectedCost: (
  movement: number,
  cost: number,
  factor: number
) => number;
