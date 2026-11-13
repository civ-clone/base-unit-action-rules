import { Land, Naval } from '@civ-clone/library-unit/Types';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { isA } from '@civ-clone/core-unit/traits';

// Whether the unit is of the `Land` domain. Shared by every rule that uses it.
export const isLandUnit = new Criterion(
  (unit: Unit, to: Tile, from: Tile = unit.tile()) => isA(unit, Land)
);

// Whether the unit is of the `Naval` domain. Shared by every rule that uses it.
export const isNavalUnit = new Criterion(
  (unit: Unit, to: Tile, from: Tile = unit.tile()) => isA(unit, Naval)
);

export const tileHasCity = (tile: Tile, cityRegistry: CityRegistry): boolean =>
  cityRegistry.getByTile(tile) !== null;
