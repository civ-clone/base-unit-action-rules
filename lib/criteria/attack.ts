import { Air, Land } from '@civ-clone/library-unit/Types';
import {
  hasMovesLeft,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import { isLandUnit, isNavalUnit, tileHasCity } from './domain';
import And from '@civ-clone/core-rule/Criteria/And';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Detonates from '@civ-clone/base-unit-trait-detonates/Detonates';
import Interceptor from '@civ-clone/base-unit-trait-interceptor/Interceptor';
import NonCombatant from '@civ-clone/base-unit-trait-non-combatant/NonCombatant';
import Or from '@civ-clone/core-rule/Criteria/Or';
import Submerged from '@civ-clone/base-unit-trait-submerged/Submerged';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { isA } from '@civ-clone/core-unit/traits';

// A unit with no attack can't attack (civ-clone/web-renderer#642).
export const hasAttack = (unit: Unit): boolean => unit.attack().value() > 0;

export interface AttackOptions {
  // Whether the unit can attack at all, asked after the check for a foreign unit on `to`. `hasAttack` by default.
  canAttack?: (unit: Unit, to: Tile, from?: Tile) => boolean;
}

/**
 * The criteria for attacking `to`, in order: a neighbouring tile, moves left, not a `NonCombatant`, not a unit that
 * `Detonates`, a foreign unit on `to`, `canAttack`, and then by domain:
 * - `Air`: unless every unit on `to` is `Air` too, only an `Interceptor`;
 * - `Land`: a city on `to`, or a `Land` unit there;
 * - `Naval`: a `Submerged` unit only at sea.
 */
export const attackCriteria = (
  {
    cityRegistry,
    unitRegistry,
  }: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>,
  { canAttack = hasAttack }: AttackOptions = {}
): Criterion[] => [
  isNeighbouringTile,
  hasMovesLeft,
  // A `NonCombatant` never attacks.
  new Criterion((unit: Unit): boolean => !unit.hasTrait(NonCombatant)),
  // A unit that `Detonates` never fights: it detonates (`nuclearAttackCriteria`).
  new Criterion((unit: Unit): boolean => !unit.hasTrait(Detonates)),
  new Criterion((unit: Unit, to: Tile): boolean =>
    unitRegistry
      .getByTile(to)
      .some((tileUnit: Unit): boolean => tileUnit.player() !== unit.player())
  ),
  // After the check for a foreign unit: working out a unit's attack runs its yield rules.
  new Criterion(canAttack),
  // Where the Unit is either...
  new Or(
    new And(
      // ...an Air Unit...
      new Criterion((unit: Unit): boolean => isA(unit, Air)),
      // ...and either...
      new Or(
        // ...not every Unit on the Tile is another Air Unit...
        new Criterion(
          (unit: Unit, to: Tile): boolean =>
            !unitRegistry
              .getByTile(to)
              .every((tileUnit: Unit): boolean => isA(tileUnit, Air))
        ),
        // ...or the Unit is an `Interceptor`.
        new Criterion((unit: Unit, to: Tile): boolean =>
          unit.hasTrait(Interceptor)
        )
      )
    ),
    new And(
      // ...or a Land Unit...
      isLandUnit,
      // ...and either...
      new Or(
        // ...the Tile has a City....
        new Criterion((unit: Unit, to: Tile): boolean =>
          tileHasCity(to, cityRegistry)
        ),
        // ...or it's attacking another Land Unit.
        new Criterion((unit: Unit, to: Tile): boolean =>
          unitRegistry
            .getByTile(to)
            .some((tileUnit: Unit): boolean => isA(tileUnit, Land))
        )
      )
    ),
    new And(
      // ...or a Naval Unit...
      isNavalUnit,
      new Or(
        // ...that is either, not `Submerged` (they can only attack other `Naval` `Unit`s...
        new Criterion((unit: Unit, to: Tile) => !unit.hasTrait(Submerged)),
        // ...or the `Tile` is `Water`.
        new Criterion((unit: Unit, to: Tile) => to.isWater())
      )
    )
  ),
];

/**
 * The criteria for taking an empty foreign city on `to`, in order: a neighbouring tile, moves left, a `Land` unit, not a
 * `NonCombatant`, a city on `to`, no units on `to`, and the city's owner isn't the unit's.
 */
export const captureCityCriteria = ({
  cityRegistry,
  unitRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>): Criterion[] => [
  isNeighbouringTile,
  hasMovesLeft,
  isLandUnit,
  // A `NonCombatant` never takes a city.
  new Criterion((unit: Unit): boolean => !unit.hasTrait(NonCombatant)),
  new Criterion((unit: Unit, to: Tile): boolean =>
    tileHasCity(to, cityRegistry)
  ),
  new Criterion(
    (unit: Unit, to: Tile): boolean => unitRegistry.getByTile(to).length === 0
  ),
  new Criterion(
    (unit: Unit, to: Tile): boolean =>
      cityRegistry.getByTile(to)!.player() !== unit.player()
  ),
];

export default attackCriteria;
