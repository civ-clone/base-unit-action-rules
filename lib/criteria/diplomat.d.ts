import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export interface Diplomat {
  diplomatCity: (unit: Unit, to: Tile, from?: Tile) => City | null;
  diplomatCriteria: Criterion[];
}
/**
 * A diplomatic mission's actions on a rival's city: next to it, with moves left, and not from the sea. Units in the city
 * don't matter: the unit never enters it.
 */
export declare const diplomat: ({
  cityRegistry,
}: Pick<Dependencies, 'cityRegistry'>) => Diplomat;
export type CanStealFrom = (unit: Unit, city: City) => boolean;
export declare const canSteal: (
  { cityRegistry }: Pick<Dependencies, 'cityRegistry'>,
  canStealFrom: CanStealFrom
) => Criterion;
export declare const hasNoEmbassy: ({
  cityRegistry,
  interactionRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'interactionRegistry'>) => Criterion;
export type IsCapital = (city: City) => boolean;
export declare const canIncite: (
  { cityRegistry }: Pick<Dependencies, 'cityRegistry'>,
  isCapital: IsCapital
) => Criterion;
/**
 * The criteria for bribing a unit, in order: a neighbouring tile, moves left, `DiplomaticMissions`, not from the sea, no
 * city on `to`, and exactly one unit there, a foreign one. No peace check: add one after these.
 */
export declare const bribeUnitCriteria: ({
  cityRegistry,
  unitRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>) => Criterion[];
export default diplomat;
