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
export const treatyGate = (
  hasSenate: HasSenate,
  {
    cityRegistry,
    unitRegistry,
  }: Partial<Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>> = {}
): TreatyGate => {
  const partner = (unit: Unit, to: Tile): Player | null => {
      if (cityRegistry === undefined || unitRegistry === undefined) {
        return null;
      }

      const city = cityRegistry.getByTile(to);

      if (city !== null) {
        return city.player();
      }

      const other = unitRegistry
        .getByTile(to)
        .find((tileUnit: Unit): boolean => tileUnit.player() !== unit.player());

      return other === undefined ? null : other.player();
    },
    senate = (unit: Unit, to: Tile, from?: Tile): boolean =>
      hasSenate(unit.player(), partner(unit, to), unit, to, from);

  return {
    isFree: new Criterion(
      (unit: Unit, to: Tile, from?: Tile): boolean => !senate(unit, to, from)
    ),
    isOverruled: new Criterion((unit: Unit, to: Tile, from?: Tile): boolean =>
      senate(unit, to, from)
    ),
  };
};

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
