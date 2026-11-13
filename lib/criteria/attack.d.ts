import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export declare const hasAttack: (unit: Unit) => boolean;
export interface AttackOptions {
  canAttack?: (unit: Unit, to: Tile, from?: Tile) => boolean;
}
/**
 * The criteria for attacking `to`, in order: a neighbouring tile, moves left, not a `NonCombatant`, not a unit that
 * `Detonates`, a foreign unit on `to`, `canAttack`, and then by domain:
 * - `Air`: unless every unit on `to` is `Air` too, only an `Interceptor`;
 * - `Land`: a city on `to`, or a `Land` unit there;
 * - `Naval`: a `Submerged` unit only at sea.
 */
export declare const attackCriteria: (
  {
    cityRegistry,
    unitRegistry,
  }: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>,
  { canAttack }?: AttackOptions
) => Criterion[];
/**
 * The criteria for taking an empty foreign city on `to`, in order: a neighbouring tile, moves left, a `Land` unit, not a
 * `NonCombatant`, a city on `to`, no units on `to`, and the city's owner isn't the unit's.
 */
export declare const captureCityCriteria: ({
  cityRegistry,
  unitRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>) => Criterion[];
export default attackCriteria;
