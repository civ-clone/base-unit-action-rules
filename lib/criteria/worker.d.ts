import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Terrain from '@civ-clone/core-terrain/Terrain';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
/**
 * The criteria for building `Improvement` on the unit's own tile, in order: a unit that `Terraforms`, moves left, an
 * `Available` rule allowing `Improvement` there for the unit's player, the current tile, then the ruleset's `extra`
 * criteria (what else the improvement needs, such as water nearby), as they are.
 */
export declare const terrainJob: (
  { ruleRegistry }: Pick<Dependencies, 'ruleRegistry'>,
  Improvement: typeof TileImprovement,
  ...extra: Criterion[]
) => Criterion[];
export declare const requiresImprovement: (
  { tileImprovementRegistry }: Pick<Dependencies, 'tileImprovementRegistry'>,
  Improvement: typeof TileImprovement
) => Criterion;
/**
 * The criteria for changing the unit's own tile's terrain, in order: moves left, the current tile, a unit that
 * `Terraforms`, the tile's terrain being one of `TerrainTypes` (the ruleset's conversion table), then the ruleset's
 * `extra` criteria, as they are.
 */
export declare const terrainConversion: (
  TerrainTypes: (typeof Terrain)[],
  ...extra: Criterion[]
) => Criterion[];
/**
 * The criteria for cleaning up the unit's own tile, in order: moves left, the current tile, a unit that `Terraforms`,
 * and a `Pollution` improvement (the ruleset's class) on the tile.
 */
export declare const cleanPollution: (
  { tileImprovementRegistry }: Pick<Dependencies, 'tileImprovementRegistry'>,
  Pollution: typeof TileImprovement
) => Criterion[];
