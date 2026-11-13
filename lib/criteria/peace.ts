import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import { Peace } from '@civ-clone/library-diplomacy/Declarations';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

export type PeaceCheck = (player: Player, other: Player) => boolean;

/**
 * Whether `player` and `other` have a `Peace` that is `active()`. What a sneak action (one that breaks the peace) asks.
 */
export const atPeace =
  (interactionRegistry: InteractionRegistry): PeaceCheck =>
  (player: Player, other: Player): boolean =>
    interactionRegistry
      .getByPlayers(player, other)
      .some(
        (interaction): interaction is Peace =>
          interaction instanceof Peace && interaction.active()
      );

/**
 * Whether every `Peace` between `player` and `other` has `expired()`, which holds when they have none. What an ordinary
 * attack or capture asks. Not the negation of `atPeace`: a `Peace` can be neither active nor expired.
 */
export const peaceExpired =
  (interactionRegistry: InteractionRegistry): PeaceCheck =>
  (player: Player, other: Player): boolean =>
    interactionRegistry
      .getByPlayers(player, other)
      .filter(
        (interaction): interaction is Peace => interaction instanceof Peace
      )
      .every((interaction) => interaction.expired());

export interface PeaceCriteria {
  atPeace: PeaceCheck;
  peaceExpired: PeaceCheck;
  // Every unit on `to` belongs to a player whose peace with the unit's player has expired (an ordinary attack).
  allPeaceExpired: Criterion;
  // Every unit on `to` belongs to a player at peace with the unit's player (a sneak attack).
  allAtPeace: Criterion;
  // The peace with the owner of the city on `to` has expired (an ordinary capture).
  ownerPeaceExpired: Criterion;
  // The owner of the city on `to` is at peace with the unit's player (a sneak capture, or a covert action).
  peaceWithOwner: Criterion;
}

// The peace checks a set of action rules shares, built once.
export const peaceCriteria = ({
  cityRegistry,
  interactionRegistry,
  unitRegistry,
}: Pick<
  Dependencies,
  'cityRegistry' | 'interactionRegistry' | 'unitRegistry'
>): PeaceCriteria => {
  const active = atPeace(interactionRegistry),
    expired = peaceExpired(interactionRegistry),
    owner = (to: Tile): Player => cityRegistry.getByTile(to)!.player();

  return {
    atPeace: active,
    peaceExpired: expired,
    allPeaceExpired: new Criterion((unit: Unit, to: Tile): boolean =>
      unitRegistry
        .getByTile(to)
        .every((tileUnit: Unit): boolean =>
          expired(unit.player(), tileUnit.player())
        )
    ),
    allAtPeace: new Criterion((unit: Unit, to: Tile): boolean =>
      unitRegistry
        .getByTile(to)
        .every((tileUnit: Unit): boolean =>
          active(unit.player(), tileUnit.player())
        )
    ),
    ownerPeaceExpired: new Criterion((unit: Unit, to: Tile): boolean =>
      expired(unit.player(), owner(to))
    ),
    peaceWithOwner: new Criterion((unit: Unit, to: Tile): boolean =>
      active(unit.player(), owner(to))
    ),
  };
};

export default peaceCriteria;
