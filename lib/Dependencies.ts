import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Engine from '@civ-clone/core-engine/Engine';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import PathFinderRegistry from '@civ-clone/core-world-path/PathFinderRegistry';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import StrategyNoteRegistry from '@civ-clone/core-strategy/StrategyNoteRegistry';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';

/**
 * The registries a ruleset's unit actions are built with, by name.
 *
 * Each builder takes only the ones it uses (`Pick<Dependencies, ...>`), so a
 * ruleset passes what it already has and nothing else.
 */
export interface Dependencies {
  cityRegistry: CityRegistry;
  engine: Engine;
  interactionRegistry: InteractionRegistry;
  pathFinderRegistry: PathFinderRegistry;
  ruleRegistry: RuleRegistry;
  strategyNoteRegistry: StrategyNoteRegistry;
  tileImprovementRegistry: TileImprovementRegistry;
  unitRegistry: UnitRegistry;
}

export default Dependencies;
