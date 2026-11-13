import {
  hasMovesLeft,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import { isLandUnit, isNavalUnit } from './domain';
import { Air } from '@civ-clone/library-unit/Types';
import And from '@civ-clone/core-rule/Criteria/And';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Or from '@civ-clone/core-rule/Criteria/Or';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { isA } from '@civ-clone/core-unit/traits';

/**
 * The criteria for an ordinary move onto `to`, in order: a neighbouring tile, moves left, the unit's domain allows it,
 * the ruleset's `zoneOfControl` criterion (see base-zone-of-control), no foreign city on `to`, and no foreign unit on
 * `to`. By domain:
 * - `Land`: from land to land, where every unit on `to` is the unit's player's own;
 * - `Naval`: from water or one of the player's own cities, to water or one of the player's own cities;
 * - `Air`: anywhere.
 */
export const domainMoveCriteria = (
  {
    cityRegistry,
    unitRegistry,
  }: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>,
  zoneOfControl: Criterion
): Criterion[] => [
  isNeighbouringTile,
  hasMovesLeft,
  new Or(
    // `Land` units can move to other `Land` `Tile`s.
    new And(
      isLandUnit,
      new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        from.isLand()
      ),
      new Criterion((unit: Unit, to: Tile): boolean => to.isLand()),
      // Either there are no units, or they're the same `Player`.
      new Criterion((unit: Unit, to: Tile): boolean =>
        unitRegistry
          .getByTile(to)
          .every(
            (tileUnit: Unit): boolean => tileUnit.player() === unit.player()
          )
      )
    ),
    new And(
      isNavalUnit,
      // `Naval` `Unit`s can either move from `Water` or a friendly `City`...
      new Or(
        new Criterion(
          (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
            from.isWater()
        ),
        new Criterion(
          (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
            cityRegistry.getByTile(from)?.player() === unit.player()
        )
      ),
      // ...to `Water` or a friendly `City`.
      new Or(
        new Criterion((unit: Unit, to: Tile): boolean => to.isWater()),
        new Criterion(
          (unit: Unit, to: Tile): boolean =>
            cityRegistry.getByTile(to)?.player() === unit.player()
        )
      )
    ),
    // `Air` `Unit`s can move anywhere. Where they could land, a ruleset can offer landing first, and this lets them fly
    // over instead.
    new Criterion((unit: Unit): boolean => isA(unit, Air))
  ),
  zoneOfControl,
  new Criterion((unit: Unit, to: Tile): boolean => {
    const city = cityRegistry.getByTile(to);

    if (city === null) {
      return true;
    }

    return city.player() === unit.player();
  }),
  new Criterion(
    (unit: Unit, to: Tile): boolean =>
      !unitRegistry
        .getByTile(to)
        .some((tileUnit) => tileUnit.player() !== unit.player())
  ),
];

export default domainMoveCriteria;
