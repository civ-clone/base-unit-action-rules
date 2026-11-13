import {
  hasMovesLeft,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Detonates from '@civ-clone/base-unit-trait-detonates/Detonates';
import { PeaceCheck } from './peace';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

export interface NuclearCriteria {
  // The other players a unit that `Detonates` would attack on `to`: those with a unit there, and the owner of a city
  //  there. Never empty land.
  nuclearTargets: (unit: Unit, to: Tile) => Player[];
  // A neighbouring tile, moves left, a unit that `Detonates`, and at least one target.
  nuclearAttackCriteria: Criterion[];
  // No target is at peace with the unit's player (an ordinary nuclear attack).
  noNuclearTargetAtPeace: Criterion;
  // Some target is at peace with the unit's player (a sneak nuclear attack).
  anyNuclearTargetAtPeace: Criterion;
}

export const nuclearCriteria = (
  {
    cityRegistry,
    unitRegistry,
  }: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>,
  atPeace: PeaceCheck
): NuclearCriteria => {
  const nuclearTargets = (unit: Unit, to: Tile): Player[] => {
    const city = cityRegistry.getByTile(to);

    return Array.from(
      new Set(
        [
          ...unitRegistry
            .getByTile(to)
            .map((tileUnit: Unit): Player => tileUnit.player()),
          ...(city === null ? [] : [city.player()]),
        ].filter((player: Player): boolean => player !== unit.player())
      )
    );
  };

  return {
    nuclearTargets,
    nuclearAttackCriteria: [
      isNeighbouringTile,
      hasMovesLeft,
      new Criterion((unit: Unit): boolean => unit.hasTrait(Detonates)),
      new Criterion(
        (unit: Unit, to: Tile): boolean => nuclearTargets(unit, to).length > 0
      ),
    ],
    noNuclearTargetAtPeace: new Criterion((unit: Unit, to: Tile): boolean =>
      nuclearTargets(unit, to).every(
        (player: Player): boolean => !atPeace(unit.player(), player)
      )
    ),
    anyNuclearTargetAtPeace: new Criterion((unit: Unit, to: Tile): boolean =>
      nuclearTargets(unit, to).some((player: Player): boolean =>
        atPeace(unit.player(), player)
      )
    ),
  };
};

export default nuclearCriteria;
