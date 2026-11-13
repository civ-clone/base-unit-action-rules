import { Action } from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import { Overruled } from '@civ-clone/library-unit/Actions';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';

export interface TreatyGate {
  // The unit's player may break a treaty: the sneak action is offered.
  isFree: Criterion;
  // The unit's player has a Senate, which won't let it break a treaty: an `Overruled` action is offered instead.
  isOverruled: Criterion;
}

/**
 * The two criteria that split an action breaking a treaty by whether its player has a Senate (`hasSenate`, the
 * ruleset's own test). Each asks `hasSenate` itself.
 */
export const treatyGate = (
  hasSenate: (player: Player) => boolean
): TreatyGate => ({
  isFree: new Criterion((unit: Unit): boolean => !hasSenate(unit.player())),
  isOverruled: new Criterion((unit: Unit): boolean => hasSenate(unit.player())),
});

export type Blocked = (unit: Unit, to: Tile, from: Tile) => UnitAction;

export interface OverruledOptions {
  // The rule id for the overruled form of the action named `name`.
  id: (name: string) => string;
  isOverruled: Criterion;
}

/**
 * Builds the overruled form of a treaty-breaking action: offered on the action's own `criteria` when `isOverruled`
 * holds, it performs an `Overruled` wrapping the action that was `blocked`, at no cost in moves.
 */
export const overruled =
  ({
    id,
    isOverruled,
    ruleRegistry,
  }: OverruledOptions & Pick<Dependencies, 'ruleRegistry'>) =>
  (name: string, blocked: Blocked, ...criteria: Criterion[]): Action =>
    new Action(
      id(name),
      ...criteria,
      isOverruled,
      new Effect(
        (unit: Unit, to: Tile, from: Tile = unit.tile()): UnitAction =>
          new Overruled(
            from,
            to,
            unit,
            blocked(unit, to, from),
            0,
            ruleRegistry
          ) as UnitAction
      )
    );

export default treatyGate;
