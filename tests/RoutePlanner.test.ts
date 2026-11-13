import {
  RouteActionType,
  RoutePlanner,
  routingEvents,
} from '../lib/RoutePlanner';
import Engine from '@civ-clone/core-engine/Engine';
import Path from '@civ-clone/core-world-path/Path';
import PathFinder from '@civ-clone/core-world-path/PathFinder';
import PathFinderRegistry from '@civ-clone/core-world-path/PathFinderRegistry';
import PlannedPathFinderRegistry from '../lib/PlannedPathFinderRegistry';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import StrategyNoteRegistry from '@civ-clone/core-strategy/StrategyNoteRegistry';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { expect } from 'chai';

describe('RoutePlanner', (): void => {
  // `EventEmitter` keeps its handlers private, so count the registrations as they're made.
  class CountingEngine extends Engine {
    registered: { [event: string]: number } = {};

    on(event: string, handler: (...args: any[]) => void): void {
      this.registered[event] = (this.registered[event] ?? 0) + 1;

      super.on(event, handler);
    }
  }

  // The criteria and effects only compare and pass these on; named, so a deep comparison tells them apart.
  const unit = { name: 'unit' } as unknown as Unit,
    otherUnit = { name: 'otherUnit' } as unknown as Unit,
    from = { name: 'from' } as unknown as Tile,
    to = { name: 'to' } as unknown as Tile,
    elsewhere = { name: 'elsewhere' } as unknown as Tile;

  // Stand-ins for the actions a ruleset builds, recording what they're given.
  class Journey {
    from: Tile;
    to: Tile;
    unit: Unit;
    ruleRegistry: RuleRegistry;
    pathFinderRegistry: PathFinderRegistry;
    strategyNoteRegistry: StrategyNoteRegistry;

    constructor(
      from: Tile,
      to: Tile,
      unit: Unit,
      ruleRegistry: RuleRegistry,
      pathFinderRegistry: PathFinderRegistry,
      strategyNoteRegistry: StrategyNoteRegistry
    ) {
      this.from = from;
      this.to = to;
      this.unit = unit;
      this.ruleRegistry = ruleRegistry;
      this.pathFinderRegistry = pathFinderRegistry;
      this.strategyNoteRegistry = strategyNoteRegistry;
    }
  }

  class Go extends Journey {}
  class Build extends Journey {}

  const setUp = (found: boolean = true) => {
    const engine = new CountingEngine(),
      pathFinderRegistry = new PathFinderRegistry(),
      ruleRegistry = new RuleRegistry(),
      strategyNoteRegistry = new StrategyNoteRegistry(),
      searches: [Unit, Tile, Tile][] = [];

    class CountingPathFinder extends PathFinder {
      generate(): Path {
        searches.push([this.unit(), this.start(), this.end()]);

        return (found ? new Path() : null) as Path;
      }
    }

    pathFinderRegistry.register(CountingPathFinder);

    const planner = new RoutePlanner({
      engine,
      pathFinderRegistry,
      ruleRegistry,
      strategyNoteRegistry,
    });

    // What a search through the registry an action was given finds, as the action would search.
    const follow = (journey: Journey): Path => {
      const [Finder] = journey.pathFinderRegistry.entries();

      return new Finder(journey.unit, journey.from, journey.to).generate();
    };

    return {
      engine,
      follow,
      pathFinderRegistry,
      planner,
      ruleRegistry,
      searches,
      strategyNoteRegistry,
    };
  };

  it('should listen once to each routing event', (): void => {
    const { engine } = setUp();

    expect(routingEvents).to.have.length(7);
    expect(engine.registered).to.deep.equal(
      Object.fromEntries(routingEvents.map((event) => [event, 1]))
    );
  });

  it('should not offer a go-to without a path finder', (): void => {
    const planner = new RoutePlanner({
      engine: new Engine(),
      pathFinderRegistry: new PathFinderRegistry(),
      ruleRegistry: new RuleRegistry(),
      strategyNoteRegistry: new StrategyNoteRegistry(),
    });

    expect(planner.goTo().validate(unit, to, from)).to.false;
    expect(planner.route().validate(unit, to, from)).to.false;
  });

  it('should not offer a go-to without a route', (): void => {
    const { planner, searches } = setUp(false);

    expect(planner.goTo().validate(unit, to, from)).to.false;
    expect(planner.route().validate(unit, to, from)).to.false;
    expect(searches).to.have.length(2);
  });

  it('should give the go-to the route it found, once', (): void => {
    const {
        follow,
        pathFinderRegistry,
        planner,
        ruleRegistry,
        searches,
        strategyNoteRegistry,
      } = setUp(),
      goTo = planner.goTo(),
      effect = planner.goToEffect(Go as RouteActionType);

    expect(goTo.validate(unit, to, from)).to.true;
    expect(searches).to.deep.equal([[unit, from, to]]);

    const journey = effect.apply(unit, to, from) as unknown as Go;

    expect(journey).to.instanceof(Go);
    expect(journey.from).to.equal(from);
    expect(journey.to).to.equal(to);
    expect(journey.unit).to.equal(unit);
    expect(journey.ruleRegistry).to.equal(ruleRegistry);
    expect(journey.strategyNoteRegistry).to.equal(strategyNoteRegistry);
    expect(journey.pathFinderRegistry).to.instanceof(PlannedPathFinderRegistry);

    // The first search is the planned route; any after it searches again.
    expect(follow(journey)).to.instanceof(Path);
    expect(searches).to.have.length(1);
    follow(journey);
    expect(searches).to.have.length(2);

    // The planned route is spent: another go-to effect searches for itself.
    const unplanned = effect.apply(unit, to, from) as unknown as Go;

    expect(unplanned.pathFinderRegistry).to.equal(pathFinderRegistry);
  });

  it('should only give the route to the journey it was found for', (): void => {
    const { pathFinderRegistry, planner } = setUp(),
      goTo = planner.goTo(),
      effect = planner.goToEffect(Go as RouteActionType);

    (
      [
        [otherUnit, to, from],
        [unit, elsewhere, from],
        [unit, to, elsewhere],
      ] as [Unit, Tile, Tile][]
    ).forEach(([effectUnit, effectTo, effectFrom]): void => {
      expect(goTo.validate(unit, to, from)).to.true;

      const journey = effect.apply(
        effectUnit,
        effectTo,
        effectFrom
      ) as unknown as Go;

      expect(journey.pathFinderRegistry).to.equal(pathFinderRegistry);
    });
  });

  routingEvents.forEach((event: string): void => {
    it(`should search again after '${event}'`, (): void => {
      const { engine, pathFinderRegistry, planner, searches } = setUp(),
        goTo = planner.goTo(),
        route = planner.route(),
        goToEffect = planner.goToEffect(Go as RouteActionType),
        routeEffect = planner.routeEffect(Build as RouteActionType);

      expect(goTo.validate(unit, to, from)).to.true;
      expect(planner.revision()).to.equal(0);

      engine.emit(event);

      expect(planner.revision()).to.equal(1);
      expect(
        (goToEffect.apply(unit, to, from) as unknown as Go).pathFinderRegistry
      ).to.equal(pathFinderRegistry);

      // Nor is the go-to's route reused for a route action.
      expect(route.validate(unit, to, from)).to.true;
      expect(searches).to.have.length(2);

      // A route found and then overtaken by events isn't followed either.
      engine.emit(event);

      expect(
        (routeEffect.apply(unit, to, from) as unknown as Build)
          .pathFinderRegistry
      ).to.equal(pathFinderRegistry);
    });
  });

  it('should reuse the route the go-to found for the same journey', (): void => {
    const { follow, planner, searches } = setUp(),
      goTo = planner.goTo(),
      roadTo = planner.route(),
      railroadTo = planner.route(),
      roadToEffect = planner.routeEffect(Build as RouteActionType),
      railroadToEffect = planner.routeEffect(Build as RouteActionType);

    expect(goTo.validate(unit, to, from)).to.true;
    expect(roadTo.validate(unit, to, from)).to.true;
    expect(railroadTo.validate(unit, to, from)).to.true;
    expect(searches).to.have.length(1);

    // The route actions share the kept route, and building one leaves it for the other.
    const roadJourney = roadToEffect.apply(unit, to, from) as unknown as Build,
      railroadJourney = railroadToEffect.apply(
        unit,
        to,
        from
      ) as unknown as Build;

    expect(roadJourney).to.instanceof(Build);
    expect(roadJourney.pathFinderRegistry).to.instanceof(
      PlannedPathFinderRegistry
    );
    expect(railroadJourney.pathFinderRegistry).to.instanceof(
      PlannedPathFinderRegistry
    );

    follow(roadJourney);
    follow(railroadJourney);

    expect(searches).to.have.length(1);
  });

  it('should search for a route action when the go-to found a different journey', (): void => {
    const { planner, searches } = setUp(),
      goTo = planner.goTo(),
      route = planner.route(),
      routeEffect = planner.routeEffect(Build as RouteActionType);

    expect(goTo.validate(unit, elsewhere, from)).to.true;
    expect(route.validate(unit, to, from)).to.true;
    expect(searches).to.deep.equal([
      [unit, from, elsewhere],
      [unit, from, to],
    ]);
    expect(
      (routeEffect.apply(unit, to, from) as unknown as Build).pathFinderRegistry
    ).to.instanceof(PlannedPathFinderRegistry);
  });

  it('should keep each planner to itself', (): void => {
    const first = setUp(),
      second = setUp(),
      goTo = first.planner.goTo(),
      effect = second.planner.goToEffect(Go as RouteActionType);

    expect(goTo.validate(unit, to, from)).to.true;

    first.engine.emit('unit:moved');

    expect(first.planner.revision()).to.equal(1);
    expect(second.planner.revision()).to.equal(0);
    expect(
      (effect.apply(unit, to, from) as unknown as Go).pathFinderRegistry
    ).to.equal(second.pathFinderRegistry);
  });
});
