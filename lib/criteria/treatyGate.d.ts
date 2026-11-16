import { Action } from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
export interface TreatyGate {
  isFree: Criterion;
  isOverruled: Criterion;
}
/**
 * Whether `player` has a Senate that won't let its `unit` break the treaty with `other` by acting from `from` on `to`.
 * `other` is the treaty partner on `to` (the owner of the city there, or else of the first other player's unit there),
 * or `null` when the gate wasn't given the registries to find it or there's nobody there. A test that looks only at
 * `player` (Civ1's) can ignore the rest. `from` is the square the action is asked from, when it's given (the unit's own,
 * usually).
 */
export type HasSenate = (
  player: Player,
  other: Player | null,
  unit: Unit,
  to: Tile,
  from?: Tile
) => boolean;
/**
 * The two criteria that split an action breaking a treaty by whether its player has a Senate (`hasSenate`, the
 * ruleset's own test). Each asks `hasSenate` itself. With `cityRegistry` and `unitRegistry`, the treaty partner on the
 * target square is found and passed; without them, it's `null` and nothing is looked up.
 */
export declare const treatyGate: (
  hasSenate: HasSenate,
  {
    cityRegistry,
    unitRegistry,
  }?: Partial<Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>>
) => TreatyGate;
export type Blocked = (unit: Unit, to: Tile, from: Tile) => UnitAction;
export interface OverruledOptions {
  id: (name: string) => string;
  isOverruled: Criterion;
}
/**
 * Builds the overruled form of a treaty-breaking action: offered on the action's own `criteria` when `isOverruled`
 * holds, it performs an `Overruled` wrapping the action that was `blocked`, at no cost in moves.
 */
export declare const overruled: ({
  id,
  isOverruled,
  ruleRegistry,
}: OverruledOptions & Pick<Dependencies, 'ruleRegistry'>) => (
  name: string,
  blocked: Blocked,
  ...criteria: Criterion[]
) => Action;
export default treatyGate;
