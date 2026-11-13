import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

// The player `unit` has a treaty with whose land `tile` is, or `null`: the ruleset's territory model.
export type PartnerOf = (unit: Unit, tile: Tile) => Player | null;

export interface PartnerCriteria {
  // The treaty partner a move onto `to` would trespass on: only a move from land onto land, and only while none of the
  //  unit's player's own units are on `to` already.
  movePartner: (unit: Unit, to: Tile, from?: Tile) => Player | null;
  // A move onto `to` trespasses on a treaty partner's land. Cheap, and most tiles fail it: list it first.
  onPartnersLand: Criterion;
  // A move onto `to` trespasses on nobody's land.
  offPartnersLand: Criterion;
  // Pillaging `to` would damage a treaty partner's land.
  pillagingPartnersLand: Criterion;
  // Pillaging `to` would damage nobody's land.
  notPillagingPartnersLand: Criterion;
}

export const partnerCriteria = (
  { unitRegistry }: Pick<Dependencies, 'unitRegistry'>,
  partnerOf: PartnerOf
): PartnerCriteria => {
  const movePartner = (
    unit: Unit,
    to: Tile,
    from: Tile = unit.tile()
  ): Player | null => {
    if (!from.isLand() || !to.isLand()) {
      return null;
    }

    const partner = partnerOf(unit, to);

    return partner !== null &&
      !unitRegistry
        .getByTile(to)
        .some((tileUnit: Unit): boolean => tileUnit.player() === unit.player())
      ? partner
      : null;
  };

  return {
    movePartner,
    onPartnersLand: new Criterion(
      (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        movePartner(unit, to, from) !== null
    ),
    offPartnersLand: new Criterion(
      (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        movePartner(unit, to, from) === null
    ),
    pillagingPartnersLand: new Criterion(
      (unit: Unit, to: Tile): boolean => partnerOf(unit, to) !== null
    ),
    notPillagingPartnersLand: new Criterion(
      (unit: Unit, to: Tile): boolean => partnerOf(unit, to) === null
    ),
  };
};

export default partnerCriteria;
