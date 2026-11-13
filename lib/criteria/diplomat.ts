import {
  hasMovesLeft,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import DiplomaticMissions from '@civ-clone/base-unit-trait-diplomatic-missions/DiplomaticMissions';
import Embassy from '@civ-clone/base-unit-action-establish-embassy/Embassy';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

export interface Diplomat {
  // The foreign city on `to` a unit with `DiplomaticMissions` on land could act on, or `null`.
  diplomatCity: (unit: Unit, to: Tile, from?: Tile) => City | null;
  // The criteria every action on a foreign city shares, in order: a neighbouring tile, moves left, and a `diplomatCity`.
  diplomatCriteria: Criterion[];
}

/**
 * A diplomatic mission's actions on a rival's city: next to it, with moves left, and not from the sea. Units in the city
 * don't matter: the unit never enters it.
 */
export const diplomat = ({
  cityRegistry,
}: Pick<Dependencies, 'cityRegistry'>): Diplomat => {
  const diplomatCity = (
    unit: Unit,
    to: Tile,
    from: Tile = unit.tile()
  ): City | null => {
    const city = cityRegistry.getByTile(to);

    return unit.hasTrait(DiplomaticMissions) &&
      from.isLand() &&
      city !== null &&
      city.player() !== unit.player()
      ? city
      : null;
  };

  return {
    diplomatCity,
    diplomatCriteria: [
      isNeighbouringTile,
      hasMovesLeft,
      new Criterion(
        (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
          diplomatCity(unit, to, from) !== null
      ),
    ],
  };
};

// Whether `unit` can steal from `city`: the ruleset's own test (what there is to take, and how often it may).
export type CanStealFrom = (unit: Unit, city: City) => boolean;

// Stealing from the city on `to`, as the ruleset's `canStealFrom` allows. List it after `diplomatCriteria`.
export const canSteal = (
  { cityRegistry }: Pick<Dependencies, 'cityRegistry'>,
  canStealFrom: CanStealFrom
): Criterion =>
  new Criterion((unit: Unit, to: Tile): boolean =>
    canStealFrom(unit, cityRegistry.getByTile(to)!)
  );

// The unit's player has no `Embassy` with the owner of the city on `to` yet. List it after `diplomatCriteria`.
export const hasNoEmbassy = ({
  cityRegistry,
  interactionRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'interactionRegistry'>): Criterion =>
  new Criterion(
    (unit: Unit, to: Tile): boolean =>
      !interactionRegistry
        .getByPlayers(unit.player(), cityRegistry.getByTile(to)!.player())
        .some(
          (interaction) =>
            interaction instanceof Embassy &&
            (interaction as unknown as Embassy).holder() === unit.player()
        )
  );

// Whether `city` is its player's capital: the ruleset's own test.
export type IsCapital = (city: City) => boolean;

// The city on `to` can be incited to revolt: it isn't a capital. List it after `diplomatCriteria`.
export const canIncite = (
  { cityRegistry }: Pick<Dependencies, 'cityRegistry'>,
  isCapital: IsCapital
): Criterion =>
  new Criterion(
    (unit: Unit, to: Tile): boolean => !isCapital(cityRegistry.getByTile(to)!)
  );

/**
 * The criteria for bribing a unit, in order: a neighbouring tile, moves left, `DiplomaticMissions`, not from the sea, no
 * city on `to`, and exactly one unit there, a foreign one. No peace check: add one after these.
 */
export const bribeUnitCriteria = ({
  cityRegistry,
  unitRegistry,
}: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>): Criterion[] => [
  isNeighbouringTile,
  hasMovesLeft,
  new Criterion((unit: Unit): boolean => unit.hasTrait(DiplomaticMissions)),
  new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
    from.isLand()
  ),
  new Criterion(
    (unit: Unit, to: Tile): boolean => cityRegistry.getByTile(to) === null
  ),
  new Criterion((unit: Unit, to: Tile): boolean => {
    const units = unitRegistry.getByTile(to);

    return units.length === 1 && units[0].player() !== unit.player();
  }),
];

export default diplomat;
