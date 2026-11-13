import { Action } from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from './Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import { Overruled } from '@civ-clone/library-unit/Actions';
import Player from '@civ-clone/core-player/Player';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
import { terrainConversion, terrainJob } from './criteria/worker';
import { treatyGate } from './criteria/treatyGate';

// Builds the unit action an action rule performs. It is the rule's `Effect` as it is: whatever default it gives `from`
//  is its own.
export type Perform = (unit: Unit, to: Tile, from: Tile) => UnitAction;

export interface BreaksTreaty {
  // The action that was refused, wrapped in the `Overruled` the overruled form performs.
  blocked: Perform;
  // What the refused action costs in moves anyway (asked after `blocked`). 0 if not given.
  cost?: (unit: Unit, to: Tile, from: Tile) => number;
}

/**
 * An action rule, `<prefix>:unit/action/<name>`, with its criteria in order and its effect (a `Perform`, or an `Effect`
 * the ruleset built itself).
 *
 * With `breaksTreaty`, it breaks a treaty, and a player with a Senate (`hasSenate`) may not take it: it is offered only
 * to a player without one, and the player with one is offered `<prefix>:unit/action/overruled/<name>` instead, on the
 * same criteria, which performs an `Overruled` wrapping `blocked`.
 */
export interface NamedRow {
  name: string;
  criteria: Criterion[];
  effect: Perform | Effect;
  breaksTreaty?: BreaksTreaty;
}

// Building `improvement` on the unit's own tile (`terrainJob`), `<prefix>:unit/action/improvement/<improvement's name>`.
export interface ImprovementRow {
  improvement: typeof TileImprovement;
  // What else the improvement needs, after `terrainJob`'s own criteria.
  extra?: Criterion[];
  effect: Perform | Effect;
}

// Changing the unit's own tile's terrain when it is one of `terrains` (`terrainConversion`),
//  `<prefix>:unit/action/terrain/<conversion's name>`.
export interface ConversionRow {
  conversion: abstract new (...args: any[]) => UnitAction;
  terrains: (typeof Terrain)[];
  extra?: Criterion[];
  effect: Perform | Effect;
}

export type ActionRow = NamedRow | ImprovementRow | ConversionRow;

export interface ActionRulesDependencies
  extends Pick<Dependencies, 'ruleRegistry'> {
  // Whether `player` has a Senate that won't let it break a treaty. Without it, no player has one: no rule is gated and
  //  no overruled form is made.
  hasSenate?: (player: Player) => boolean;
}

// The id of the action rule `name` of a ruleset: `<prefix>:unit/action/<name>`.
export const actionId = (prefix: string, name: string): string =>
  `${prefix}:unit/action/${name}`;

const effectOf = (effect: Perform | Effect): Effect =>
  effect instanceof Effect ? effect : new Effect(effect);

/**
 * A ruleset's action rules, built from its `table`, in the table's order: that order is the order the rules are
 * registered in, so the order in which a unit is offered its actions (the UI lists them in it; an AI may take the first).
 * A rule's criteria are the row's, as they are and in order, then the treaty gate for a treaty-breaking row. A row
 * left out of the table is a rule the ruleset doesn't have.
 */
export const actionRules = (
  prefix: string,
  table: ActionRow[],
  { ruleRegistry, hasSenate }: ActionRulesDependencies
): Action[] => {
  const gate = hasSenate === undefined ? null : treatyGate(hasSenate),
    rules: Action[] = [];

  table.forEach((row: ActionRow): void => {
    if ('improvement' in row) {
      rules.push(
        new Action(
          actionId(prefix, `improvement/${row.improvement.name}`),
          ...terrainJob(
            { ruleRegistry },
            row.improvement,
            ...(row.extra ?? [])
          ),
          effectOf(row.effect)
        )
      );

      return;
    }

    if ('conversion' in row) {
      rules.push(
        new Action(
          actionId(prefix, `terrain/${row.conversion.name}`),
          ...terrainConversion(row.terrains, ...(row.extra ?? [])),
          effectOf(row.effect)
        )
      );

      return;
    }

    if (row.breaksTreaty === undefined || gate === null) {
      rules.push(
        new Action(
          actionId(prefix, row.name),
          ...row.criteria,
          effectOf(row.effect)
        )
      );

      return;
    }

    const { blocked, cost } = row.breaksTreaty;

    rules.push(
      new Action(
        actionId(prefix, row.name),
        ...row.criteria,
        gate.isFree,
        effectOf(row.effect)
      ),
      new Action(
        actionId(prefix, `overruled/${row.name}`),
        ...row.criteria,
        gate.isOverruled,
        new Effect(
          (unit: Unit, to: Tile, from: Tile = unit.tile()): UnitAction => {
            const action = blocked(unit, to, from);

            return new Overruled(
              from,
              to,
              unit,
              action,
              cost === undefined ? 0 : cost(unit, to, from),
              ruleRegistry
            ) as UnitAction;
          }
        )
      )
    );
  });

  return rules;
};

export default actionRules;
