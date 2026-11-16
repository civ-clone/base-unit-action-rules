import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
export type PeaceCheck = (player: Player, other: Player) => boolean;
/**
 * Whether `player` and `other` have a treaty in force: a ceasefire, a peace, or an alliance (which implies peace), by
 *  base-diplomacy's `hasTreatyLevel`. What a sneak action (one that breaks the treaty) asks: breaking a ceasefire is a
 *  sneak action as breaking a peace is. Civ1 makes no ceasefires, so for it this is "at peace".
 */
export declare const atPeace: (
  interactionRegistry: InteractionRegistry
) => PeaceCheck;
/**
 * Whether every `Peace` and `Ceasefire` between `player` and `other` has `expired()`, which holds when they have none.
 * What an ordinary attack or capture asks. Not the negation of `atPeace`: a declaration can be neither active nor
 * expired.
 */
export declare const peaceExpired: (
  interactionRegistry: InteractionRegistry
) => PeaceCheck;
export interface PeaceCriteria {
  atPeace: PeaceCheck;
  peaceExpired: PeaceCheck;
  allPeaceExpired: Criterion;
  allAtPeace: Criterion;
  ownerPeaceExpired: Criterion;
  peaceWithOwner: Criterion;
}
export declare const peaceCriteria: ({
  cityRegistry,
  interactionRegistry,
  unitRegistry,
}: Pick<
  Dependencies,
  'cityRegistry' | 'interactionRegistry' | 'unitRegistry'
>) => PeaceCriteria;
export default peaceCriteria;
