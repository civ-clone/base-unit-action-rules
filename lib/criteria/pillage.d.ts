import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
export type Pillageable = (improvement: TileImprovement) => boolean;
/**
 * The criteria for pillaging the unit's own tile, in order: moves left, the current tile, a unit that `Fortifies` or
 * `Terraforms`, not a `NonCombatant`, and at least one `pillageable` improvement there.
 */
export declare const pillageCriteria: (
  { tileImprovementRegistry }: Pick<Dependencies, 'tileImprovementRegistry'>,
  pillageable: Pillageable
) => Criterion[];
export default pillageCriteria;
