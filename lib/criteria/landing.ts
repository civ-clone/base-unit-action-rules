import { Air, NavalTransport } from '@civ-clone/library-unit/Types';
import Dependencies from '../Dependencies';
import { ITransport } from '@civ-clone/core-unit-transport/Transport';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { isA } from '@civ-clone/core-unit/traits';

export interface Landing {
  // Whether `to` is one of the unit's player's own cities.
  landsInCity: (unit: Unit, to: Tile) => boolean;
  // The first of the unit's player's own `NavalTransport`s on `to` with room for it that can carry it, or `null`.
  landingTransport: (unit: Unit, to: Tile) => ITransport | null;
  // Whether an `Air` unit moving onto `to` can land there: in its own city, or on its own transport.
  canLandAircraft: (unit: Unit, to: Tile) => boolean;
}

// Where an aircraft moving onto `to` would land.
export const landing = ({
  cityRegistry,
  unitRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>): Landing => {
  const landsInCity = (unit: Unit, to: Tile): boolean =>
      cityRegistry.getByTile(to)?.player() === unit.player(),
    landingTransport = (unit: Unit, to: Tile): ITransport | null => {
      const [transport] = unitRegistry
        .getByTile(to)
        .filter(
          (tileUnit: Unit): boolean =>
            tileUnit instanceof NavalTransport &&
            tileUnit.player() === unit.player() &&
            tileUnit.hasCapacity() &&
            tileUnit.canStow(unit)
        );

      return (transport as unknown as ITransport) ?? null;
    },
    canLandAircraft = (unit: Unit, to: Tile): boolean =>
      isA(unit, Air) &&
      (landsInCity(unit, to) || landingTransport(unit, to) !== null);

  return {
    landsInCity,
    landingTransport,
    canLandAircraft,
  };
};

export default landing;
