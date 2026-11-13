import { hasMovesLeft, isCurrentTile } from '@civ-clone/core-unit/Rules/Action';
import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import { Fortified } from '@civ-clone/library-unit/UnitImprovements';
import Fortifies from '@civ-clone/base-unit-trait-fortifies/Fortifies';
import FoundsCities from '@civ-clone/base-unit-trait-founds-cities/FoundsCities';
import { Naval } from '@civ-clone/library-unit/Types';
import Stowed from '@civ-clone/base-unit-action-embark/Busy/Stowed';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
import { isA } from '@civ-clone/core-unit/traits';
import { joinableCity } from '@civ-clone/base-unit-action-join-city/joinableCity';
import { tileHasCity } from './domain';

export interface OrderCriteria {
  // A unit that `Fortifies`, with moves left, on land.
  fortifyCriteria: Criterion[];
  // Any unit with moves left.
  sleepCriteria: Criterion[];
  // A unit that's busy (asleep or at a job) or `Fortified`, but not `Stowed` cargo.
  activateCriteria: Criterion[];
  // Any unit with moves left.
  disbandCriteria: Criterion[];
  // Any unit.
  noOrdersCriteria: Criterion[];
  // A unit that `FoundsCities`, with moves left, on land with no city.
  foundCityCriteria: Criterion[];
  // A unit that `FoundsCities`, with moves left, in a city it can join (`joinableCity`).
  joinCityCriteria: Criterion[];
  // Any unit with moves left, in one of its player's cities.
  setHomeCityCriteria: Criterion[];
  // A unit that `Fortifies`, or a `Naval` one, with moves left.
  exploreCriteria: Criterion[];
  // A unit that `Terraforms`, with moves left.
  automateCriteria: Criterion[];
}

/**
 * The criteria for the orders a unit is given on its own tile, each list in the order its rule checks them. Every list
 * starts with the shared `hasMovesLeft` and `isCurrentTile` criteria the order needs.
 */
export const orders = ({
  cityRegistry,
  ruleRegistry,
  unitImprovementRegistry,
}: Pick<
  Dependencies,
  'cityRegistry' | 'ruleRegistry' | 'unitImprovementRegistry'
>): OrderCriteria => ({
  fortifyCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion((unit: Unit): boolean => unit.hasTrait(Fortifies)),
    new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
      from.isLand()
    ),
  ],
  sleepCriteria: [hasMovesLeft, isCurrentTile],
  // Not cargo: a unit `Stowed` aboard a transport is woken by unloading, and an aircraft collected by a carrier stays
  //  active while stowed, so it would be offered this beside its own orders.
  activateCriteria: [
    isCurrentTile,
    new Criterion(
      (unit: Unit): boolean =>
        !(unit.busy() instanceof Stowed) &&
        (unit.busy() !== null ||
          unitImprovementRegistry
            .getByUnit(unit)
            .some(
              (unitImprovement: UnitImprovement): boolean =>
                unitImprovement instanceof Fortified
            ))
    ),
  ],
  disbandCriteria: [hasMovesLeft, isCurrentTile],
  noOrdersCriteria: [isCurrentTile],
  foundCityCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion((unit: Unit): boolean => unit.hasTrait(FoundsCities)),
    new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
      from.isLand()
    ),
    new Criterion(
      (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        !tileHasCity(from, cityRegistry)
    ),
  ],
  joinCityCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion((unit: Unit): boolean => unit.hasTrait(FoundsCities)),
    new Criterion(
      (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        joinableCity(unit, from, cityRegistry, ruleRegistry) !== null
    ),
  ],
  setHomeCityCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion((unit: Unit, to: Tile, from: Tile): boolean => {
      const city = cityRegistry.getByTile(from);

      if (!(city instanceof City)) {
        return false;
      }

      return city.player() === unit.player();
    }),
  ],
  // Land units that fight (and others with `Fortifies`) and ships. Not workers, which have work to do, nor aircraft,
  //  which have fuel to mind.
  exploreCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion(
      (unit: Unit): boolean => unit.hasTrait(Fortifies) || isA(unit, Naval)
    ),
  ],
  automateCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion((unit: Unit): boolean => unit.hasTrait(Terraforms)),
  ],
});

export default orders;
