import Dependencies from '../Dependencies';
import { ITransport } from '@civ-clone/core-unit-transport/Transport';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export interface Landing {
  landsInCity: (unit: Unit, to: Tile) => boolean;
  landingTransport: (unit: Unit, to: Tile) => ITransport | null;
  canLandAircraft: (unit: Unit, to: Tile) => boolean;
}
export declare const landing: ({
  cityRegistry,
  unitRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>) => Landing;
export default landing;
