import {
  Air,
  Land as LandUnit,
  NavalTransport,
} from '@civ-clone/library-unit/Types';
import {
  hasMovesLeft,
  isCurrentTile,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Or from '@civ-clone/core-rule/Criteria/Or';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { Water } from '@civ-clone/core-terrain/Types';
import { isA } from '@civ-clone/core-unit/traits';
import { isLandUnit } from './domain';

export interface TransportCriteria {
  // A land unit boarding one of its player's `NavalTransport`s with room for it on a neighbouring `Water` tile that
  //  holds no foreign unit.
  embarkCriteria: Criterion[];
  // A unit aboard a transport (not an aircraft) leaving it for a neighbouring tile: land, for a land unit.
  disembarkCriteria: Criterion[];
  // A `NavalTransport` with cargo, beside land, unloading where it is.
  unloadCriteria: Criterion[];
}

// The criteria for boarding and leaving a transport, each list in the order its rule checks them.
export const transport = ({
  transportRegistry,
  unitRegistry,
}: Pick<
  Dependencies,
  'transportRegistry' | 'unitRegistry'
>): TransportCriteria => ({
  embarkCriteria: [
    isNeighbouringTile,
    hasMovesLeft,
    isLandUnit,
    new Criterion(
      (unit: Unit, to: Tile): boolean => to.terrain() instanceof Water
    ),
    new Criterion((unit: Unit, to: Tile): boolean =>
      unitRegistry
        .getByTile(to)
        .every((tileUnit: Unit): boolean => tileUnit.player() === unit.player())
    ),
    new Criterion((unit: Unit, to: Tile): boolean =>
      unitRegistry
        .getByTile(to)
        .filter((tileUnit: Unit): boolean => tileUnit instanceof NavalTransport)
        .some(
          (tileUnit: Unit): boolean =>
            (tileUnit as NavalTransport).hasCapacity() &&
            (tileUnit as NavalTransport).canStow(unit)
        )
    ),
  ],
  disembarkCriteria: [
    isNeighbouringTile,
    // `hasUnit`, not `getByUnit` in a `try`: the answer is nearly always "no", and `getByUnit` gives it by throwing. It
    //  is asked of every tile beside every unit an AI considers moving, so it comes first.
    new Criterion((unit: Unit): boolean => transportRegistry.hasUnit(unit)),
    // An aircraft takes off with a plain move instead: leaving a transport this way ends the unit's turn.
    new Criterion((unit: Unit): boolean => !isA(unit, Air)),
    new Or(
      new Criterion((unit: Unit, to: Tile): boolean => !isA(unit, LandUnit)),
      new Criterion((unit: Unit, to: Tile): boolean => to.isLand())
    ),
    new Criterion(
      (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        transportRegistry.getByUnit(unit).transport().tile() === from
    ),
  ],
  unloadCriteria: [
    hasMovesLeft,
    isCurrentTile,
    new Criterion((unit: Unit): boolean => unit instanceof NavalTransport),
    new Criterion((unit: Unit): boolean => (unit as NavalTransport).hasCargo()),
    new Criterion((unit: Unit, to: Tile): boolean =>
      to.getNeighbours().some((tile: Tile): boolean => tile.isLand())
    ),
  ],
});

export default transport;
