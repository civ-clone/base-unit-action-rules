import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from './Dependencies';
import Effect from '@civ-clone/core-rule/Effect';
import Path from '@civ-clone/core-world-path/Path';
import PathFinderRegistry from '@civ-clone/core-world-path/PathFinderRegistry';
import PlannedPathFinderRegistry from './PlannedPathFinderRegistry';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import StrategyNoteRegistry from '@civ-clone/core-strategy/StrategyNoteRegistry';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';

/** A route found for `unit` from `from` to `to`, at the routing `revision` it was found at. */
export type PlannedRoute = {
  unit: Unit;
  from: Tile;
  to: Tile;
  path: Path;
  revision: number;
};

/** An action that follows a route, constructed as `GoTo` is. */
export type RouteActionType = new (
  from: Tile,
  to: Tile,
  unit: Unit,
  ruleRegistry: RuleRegistry,
  pathFinderRegistry: PathFinderRegistry,
  strategyNoteRegistry: StrategyNoteRegistry
) => UnitAction;

/**
 * The events that change where units (and cities) are, which is what a route
 * depends on besides the tiles themselves.
 */
export const routingEvents: string[] = [
  'city:captured',
  'city:created',
  'city:destroyed',
  'unit:created',
  'unit:destroyed',
  'unit:moved',
  'unit:transferred',
];

/**
 * The routes found to offer the distant actions, kept for the actions that are
 * then performed (civ-clone/web-renderer#307).
 *
 * The `goTo()` criterion has to find a route to say whether a go-to is on
 * offer, and the action it builds would otherwise look for the same route
 * again; `goToEffect()` hands the action that route instead. `route()` and
 * `routeEffect()` do the same for actions that build along the way (a road to,
 * say), and reuse the route the `goTo()` criterion found for the same journey
 * a moment before, when it did, so offering them costs no search of their own.
 *
 * This relies on every action's criteria being validated before any effect
 * runs, so a ruleset lists its go-to action before the route actions that
 * reuse its route.
 *
 * A route is only followed while nothing in `routingEvents` has happened since
 * it was found, so one kept for an action performed later (not in the same
 * `handleAction`) is searched for again instead.
 *
 * Make one per set of rules: each listens to `routingEvents` on `engine`.
 */
export class RoutePlanner {
  private _pathFinderRegistry: PathFinderRegistry;
  private _plannedGoTo: PlannedRoute | null = null;
  private _plannedRoute: PlannedRoute | null = null;
  private _revision: number = 0;
  private _ruleRegistry: RuleRegistry;
  private _strategyNoteRegistry: StrategyNoteRegistry;

  constructor({
    engine,
    pathFinderRegistry,
    ruleRegistry,
    strategyNoteRegistry,
  }: Pick<
    Dependencies,
    'engine' | 'pathFinderRegistry' | 'ruleRegistry' | 'strategyNoteRegistry'
  >) {
    this._pathFinderRegistry = pathFinderRegistry;
    this._ruleRegistry = ruleRegistry;
    this._strategyNoteRegistry = strategyNoteRegistry;

    routingEvents.forEach((event: string): void => {
      engine.on(event, (): void => {
        this._revision++;
        this._plannedGoTo = null;
      });
    });
  }

  /** Counts the `routingEvents` seen so far. */
  revision(): number {
    return this._revision;
  }

  /** Whether `unit` can find a route from `from` to `to`, keeping it for `goToEffect()`. */
  goTo(): Criterion {
    return new Criterion((unit: Unit, to: Tile, from: Tile) => {
      const [PathFinder] = this._pathFinderRegistry.entries();

      this._plannedGoTo = null;

      if (!PathFinder) {
        return false;
      }

      const path = new PathFinder(unit, from, to).generate();

      if (!(path instanceof Path)) {
        return false;
      }

      this._plannedGoTo = {
        unit,
        from,
        to,
        path,
        revision: this._revision,
      };

      return true;
    });
  }

  /** A `GoToAction` that follows the route `goTo()` found, if it is still the one for this journey. */
  goToEffect(GoToAction: RouteActionType): Effect {
    return new Effect((unit: Unit, to: Tile, from: Tile): UnitAction => {
      const planned = this._plannedGoTo,
        isPlanned =
          planned !== null &&
          planned.unit === unit &&
          planned.from === from &&
          planned.to === to &&
          planned.revision === this._revision;

      this._plannedGoTo = null;

      return new GoToAction(
        from,
        to,
        unit,
        this._ruleRegistry,
        isPlanned
          ? this.plannedPathFinderRegistry(planned)
          : this._pathFinderRegistry,
        this._strategyNoteRegistry
      );
    });
  }

  /**
   * Whether `unit` can find a route from `from` to `to`, reusing the one `goTo()` just found for the same journey,
   *  keeping it for `routeEffect()`. The route actions share one kept route.
   */
  route(): Criterion {
    return new Criterion((unit: Unit, to: Tile, from: Tile) => {
      const found = this._plannedGoTo;

      this._plannedRoute = null;

      if (
        found !== null &&
        found.unit === unit &&
        found.from === from &&
        found.to === to &&
        found.revision === this._revision
      ) {
        this._plannedRoute = found;

        return true;
      }

      const [PathFinder] = this._pathFinderRegistry.entries();

      if (!PathFinder) {
        return false;
      }

      const path = new PathFinder(unit, from, to).generate();

      if (!(path instanceof Path)) {
        return false;
      }

      this._plannedRoute = {
        unit,
        from,
        to,
        path,
        revision: this._revision,
      };

      return true;
    });
  }

  /** A `RouteAction` that follows the route `route()` found, if it is still the one for this journey. */
  routeEffect(RouteAction: RouteActionType): Effect {
    return new Effect((unit: Unit, to: Tile, from: Tile): UnitAction => {
      const planned = this._plannedRoute,
        isPlanned =
          planned !== null &&
          planned.unit === unit &&
          planned.from === from &&
          planned.to === to &&
          planned.revision === this._revision;

      return new RouteAction(
        from,
        to,
        unit,
        this._ruleRegistry,
        isPlanned
          ? this.plannedPathFinderRegistry(planned)
          : this._pathFinderRegistry,
        this._strategyNoteRegistry
      );
    });
  }

  private plannedPathFinderRegistry(
    planned: PlannedRoute
  ): PlannedPathFinderRegistry {
    return new PlannedPathFinderRegistry(
      planned.unit,
      planned.from,
      planned.to,
      planned.path,
      this._pathFinderRegistry,
      () => this._revision,
      planned.revision
    );
  }
}

export default RoutePlanner;
