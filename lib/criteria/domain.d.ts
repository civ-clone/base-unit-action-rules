import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export declare const isLandUnit: Criterion<
  [unit: Unit, to: Tile, from?: Tile | undefined]
>;
export declare const isNavalUnit: Criterion<
  [unit: Unit, to: Tile, from?: Tile | undefined]
>;
export declare const tileHasCity: (
  tile: Tile,
  cityRegistry: CityRegistry
) => boolean;
