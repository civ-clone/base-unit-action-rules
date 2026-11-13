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
 * The two criteria that split an action breaking a treaty by whether its player has a Senate (`hasSenate`, the
 * ruleset's own test). Each asks `hasSenate` itself.
 */
export declare const treatyGate: (
  hasSenate: (player: Player) => boolean
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
