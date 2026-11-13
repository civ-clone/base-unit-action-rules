import { hasMovesLeft, isCurrentTile } from '@civ-clone/core-unit/Rules/Action';
import Available from '@civ-clone/core-tile-improvement/Rules/Available';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import Unit from '@civ-clone/core-unit/Unit';

/**
 * The criteria for building `Improvement` on the unit's own tile, in order: a unit that `Terraforms`, moves left, an
 * `Available` rule allowing `Improvement` there for the unit's player, the current tile, then the ruleset's `extra`
 * criteria (what else the improvement needs, such as water nearby), as they are.
 */
export const terrainJob = (
  { ruleRegistry }: Pick<Dependencies, 'ruleRegistry'>,
  Improvement: typeof TileImprovement,
  ...extra: Criterion[]
): Criterion[] => [
  new Criterion((unit: Unit): boolean => unit.hasTrait(Terraforms)),
  hasMovesLeft,
  new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
    ruleRegistry
      .get(Available)
      .some((rule: Available): boolean =>
        rule.validate(from, Improvement, unit.player())
      )
  ),
  isCurrentTile,
  ...extra,
];

// `to` already has an `Improvement` (one improvement built on another). For a `terrainJob`'s `extra`.
export const requiresImprovement = (
  { tileImprovementRegistry }: Pick<Dependencies, 'tileImprovementRegistry'>,
  Improvement: typeof TileImprovement
): Criterion =>
  new Criterion((unit: Unit, to: Tile) =>
    tileImprovementRegistry
      .getByTile(to)
      .some(
        (tileImprovement: TileImprovement) =>
          tileImprovement instanceof Improvement
      )
  );

/**
 * The criteria for changing the unit's own tile's terrain, in order: moves left, the current tile, a unit that
 * `Terraforms`, the tile's terrain being one of `TerrainTypes` (the ruleset's conversion table), then the ruleset's
 * `extra` criteria, as they are.
 */
export const terrainConversion = (
  TerrainTypes: (typeof Terrain)[],
  ...extra: Criterion[]
): Criterion[] => [
  hasMovesLeft,
  isCurrentTile,
  new Criterion((unit: Unit): boolean => unit.hasTrait(Terraforms)),
  new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
    TerrainTypes.some(
      (TerrainType: typeof Terrain): boolean =>
        from.terrain() instanceof TerrainType
    )
  ),
  ...extra,
];

/**
 * The criteria for cleaning up the unit's own tile, in order: moves left, the current tile, a unit that `Terraforms`,
 * and a `Pollution` improvement (the ruleset's class) on the tile.
 */
export const cleanPollution = (
  { tileImprovementRegistry }: Pick<Dependencies, 'tileImprovementRegistry'>,
  Pollution: typeof TileImprovement
): Criterion[] => [
  hasMovesLeft,
  isCurrentTile,
  new Criterion((unit: Unit): boolean => unit.hasTrait(Terraforms)),
  new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
    tileImprovementRegistry
      .getByTile(from)
      .some(
        (improvement: TileImprovement): boolean =>
          improvement instanceof Pollution
      )
  ),
];
