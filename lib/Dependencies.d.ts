import Engine from '@civ-clone/core-engine/Engine';
import PathFinderRegistry from '@civ-clone/core-world-path/PathFinderRegistry';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import StrategyNoteRegistry from '@civ-clone/core-strategy/StrategyNoteRegistry';
/**
 * The registries a ruleset's unit actions are built with, by name.
 *
 * Each builder takes only the ones it uses (`Pick<Dependencies, ...>`), so a
 * ruleset passes what it already has and nothing else.
 */
export interface Dependencies {
  engine: Engine;
  pathFinderRegistry: PathFinderRegistry;
  ruleRegistry: RuleRegistry;
  strategyNoteRegistry: StrategyNoteRegistry;
}
export default Dependencies;
