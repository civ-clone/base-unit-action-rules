import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export type PartnerOf = (unit: Unit, tile: Tile) => Player | null;
export interface PartnerCriteria {
  movePartner: (unit: Unit, to: Tile, from?: Tile) => Player | null;
  onPartnersLand: Criterion;
  offPartnersLand: Criterion;
  pillagingPartnersLand: Criterion;
  notPillagingPartnersLand: Criterion;
}
export declare const partnerCriteria: (
  { unitRegistry }: Pick<Dependencies, 'unitRegistry'>,
  partnerOf: PartnerOf
) => PartnerCriteria;
export default partnerCriteria;
