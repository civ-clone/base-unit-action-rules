import { Action } from '@civ-clone/core-unit/Rules/Action';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from './Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Player from '@civ-clone/core-player/Player';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
export type Perform = (unit: Unit, to: Tile, from: Tile) => UnitAction;
export interface BreaksTreaty {
  blocked: Perform;
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
export interface ImprovementRow {
  improvement: typeof TileImprovement;
  extra?: Criterion[];
  effect: Perform | Effect;
}
export interface ConversionRow {
  conversion: abstract new (...args: any[]) => UnitAction;
  terrains: (typeof Terrain)[];
  extra?: Criterion[];
  effect: Perform | Effect;
}
export type ActionRow = NamedRow | ImprovementRow | ConversionRow;
export interface ActionRulesDependencies
  extends Pick<Dependencies, 'ruleRegistry'> {
  hasSenate?: (player: Player) => boolean;
}
export declare const actionId: (prefix: string, name: string) => string;
/**
 * A ruleset's action rules, built from its `table`, in the table's order: that order is the order the rules are
 * registered in, so the order in which a unit is offered its actions (the UI lists them in it; an AI may take the first).
 * A rule's criteria are the row's, as they are and in order, then the treaty gate for a treaty-breaking row. A row
 * left out of the table is a rule the ruleset doesn't have.
 */
export declare const actionRules: (
  prefix: string,
  table: ActionRow[],
  { ruleRegistry, hasSenate }: ActionRulesDependencies
) => Action[];
export default actionRules;
