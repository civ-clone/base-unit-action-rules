import { hasMovesLeft, isCurrentTile } from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Fortifies from '@civ-clone/base-unit-trait-fortifies/Fortifies';
import NonCombatant from '@civ-clone/base-unit-trait-non-combatant/NonCombatant';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import Unit from '@civ-clone/core-unit/Unit';

// Whether `improvement` is one a unit can pillage: the ruleset's own list.
export type Pillageable = (improvement: TileImprovement) => boolean;

/**
 * The criteria for pillaging the unit's own tile, in order: moves left, the current tile, a unit that `Fortifies` or
 * `Terraforms`, not a `NonCombatant`, and at least one `pillageable` improvement there.
 */
export const pillageCriteria = (
  { tileImprovementRegistry }: Pick<Dependencies, 'tileImprovementRegistry'>,
  pillageable: Pillageable
): Criterion[] => [
  hasMovesLeft,
  isCurrentTile,
  // Military units (`Fortifies`) and workers (`Terraforms`).
  new Criterion(
    (unit: Unit): boolean =>
      unit.hasTrait(Fortifies) || unit.hasTrait(Terraforms)
  ),
  new Criterion((unit: Unit): boolean => !unit.hasTrait(NonCombatant)),
  new Criterion(
    (unit: Unit, to: Tile): boolean =>
      tileImprovementRegistry.getByTile(to).filter(pillageable).length > 0
  ),
];

export default pillageCriteria;
