import {
  Air,
  Land,
  Naval,
  NavalTransport,
} from '@civ-clone/library-unit/Types';
import {
  cleanPollution,
  requiresImprovement,
  terrainConversion,
  terrainJob,
} from '../lib/criteria/worker';
import {
  hasMovesLeft,
  isCurrentTile,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import Available from '@civ-clone/core-tile-improvement/Rules/Available';
import CanJoinCity from '@civ-clone/base-unit-action-join-city/Rules/CanJoinCity';
import City from '@civ-clone/core-city/City';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import { Fortified } from '@civ-clone/library-unit/UnitImprovements';
import Fortifies from '@civ-clone/base-unit-trait-fortifies/Fortifies';
import FoundsCities from '@civ-clone/base-unit-trait-founds-cities/FoundsCities';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Stowed from '@civ-clone/base-unit-action-embark/Busy/Stowed';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import TransportRegistry from '@civ-clone/core-unit-transport/TransportRegistry';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
import UnitImprovementRegistry from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import { Water } from '@civ-clone/core-terrain/Types';
import { expect } from 'chai';
import orders from '../lib/criteria/orders';
import transport from '../lib/criteria/transport';

// Stand-ins: the criteria ask a tile for its terrain, whether it's land and what neighbours it, a unit for its player,
// tile, traits, moves, busy state and (a transport) room and cargo, and the registries for what's on or aboard what.
// Units, terrains and improvements are made from real classes (with no constructor run), so `isA` and `instanceof` see
// them as such.
class Open extends Terrain {}
class Wooded extends Terrain {}
class Marsh extends Terrain {}
class Sea extends Water {}
class Track extends TileImprovement {}
class Rail extends TileImprovement {}
class Ditch extends TileImprovement {}
class Smog extends TileImprovement {}
class Veteran extends UnitImprovement {}
class Asleep {}

type StandInTile = Tile & { name: string };

interface UnitOptions {
  busy?: object | null;
  canStow?: boolean;
  hasCapacity?: boolean;
  hasCargo?: boolean;
  moves?: number;
  traits?: Function[];
}

const make = <T>(Type: Function, properties: object = {}): T =>
    Object.assign(Object.create(Type.prototype), properties) as T,
  tile = (
    name: string,
    TerrainType: typeof Terrain = Open,
    neighbours: () => Tile[] = () => []
  ): StandInTile => {
    const terrain = make<Terrain>(TerrainType);

    return {
      name,
      terrain: (): Terrain => terrain,
      isLand: (): boolean => !(terrain instanceof Water),
      getNeighbours: (): Tile[] => neighbours(),
      isNeighbourOf: (other: Tile): boolean => neighbours().includes(other),
    } as unknown as StandInTile;
  },
  player = (name: string): Player => ({ name } as unknown as Player);

const setUp = () => {
  const units = new Map<Tile, Unit[]>(),
    cities = new Map<Tile, City>(),
    improvements = new Map<Tile, TileImprovement[]>(),
    unitImprovements = new Map<Unit, UnitImprovement[]>(),
    aboard = new Map<Unit, Unit>(),
    asked: string[] = [],
    ruleRegistry = new RuleRegistry(),
    unitRegistry = {
      getByTile: (tile: Tile): Unit[] => units.get(tile) ?? [],
    } as unknown as UnitRegistry,
    cityRegistry = {
      getByTile: (tile: Tile): City | null => cities.get(tile) ?? null,
    } as unknown as CityRegistry,
    tileImprovementRegistry = {
      getByTile: (tile: Tile): TileImprovement[] =>
        improvements.get(tile) ?? [],
    } as unknown as TileImprovementRegistry,
    unitImprovementRegistry = {
      getByUnit: (unit: Unit): UnitImprovement[] =>
        unitImprovements.get(unit) ?? [],
    } as unknown as UnitImprovementRegistry,
    transportRegistry = {
      hasUnit: (unit: Unit): boolean => {
        asked.push('hasUnit');

        return aboard.has(unit);
      },
      getByUnit: (unit: Unit) => {
        asked.push('getByUnit');

        if (!aboard.has(unit)) {
          throw new TypeError('not aboard');
        }

        return { transport: () => aboard.get(unit) };
      },
    } as unknown as TransportRegistry,
    unit = (
      Type: typeof Unit,
      owner: Player,
      on: Tile,
      {
        busy = null,
        canStow = true,
        hasCapacity = true,
        hasCargo = false,
        moves = 1,
        traits = [],
      }: UnitOptions = {}
    ): Unit => {
      const properties: { [key: string]: unknown } = {
        player: (): Player => owner,
        tile: (): Tile => on,
        hasTrait: (Trait: Function): boolean => traits.includes(Trait),
        moves: () => ({ value: (): number => moves }),
        busy: () => busy,
      };

      // Only a transport answers these: asking any other unit throws, as it has no such method.
      if (Type === NavalTransport || Type.prototype instanceof NavalTransport) {
        Object.assign(properties, {
          hasCapacity: (): boolean => hasCapacity,
          canStow: (): boolean => canStow,
          hasCargo: (): boolean => hasCargo,
        });
      }

      const unit = make<Unit>(Type, properties);

      units.set(on, [...(units.get(on) ?? []), unit]);

      return unit;
    },
    city = (owner: Player, on: Tile): City => {
      const city = make<City>(City, { player: (): Player => owner });

      cities.set(on, city);

      return city;
    },
    improve = (on: Tile, ...list: TileImprovement[]): void => {
      improvements.set(on, list);
    },
    improveUnit = (unit: Unit, ...list: UnitImprovement[]): void => {
      unitImprovements.set(unit, list);
    },
    board = (cargo: Unit, ship: Unit): void => {
      aboard.set(cargo, ship);
    };

  return {
    asked,
    cityRegistry,
    ruleRegistry,
    tileImprovementRegistry,
    transportRegistry,
    unitImprovementRegistry,
    unitRegistry,
    unit,
    city,
    improve,
    improveUnit,
    board,
  };
};

// The index of the first criterion in `criteria` that doesn't hold, or -1.
const firstFailing = (criteria: Criterion[], ...args: any[]): number =>
  criteria.findIndex(
    (criterion: Criterion): boolean => !criterion.validate(...args)
  );

// Counts the leaf `Criterion#validate` calls (`And` and `Or` override `validate`) while `fn` runs.
const leafCalls = (fn: () => void): number => {
  const validate = Criterion.prototype.validate;
  let calls = 0;

  Criterion.prototype.validate = function (this: Criterion, ...args: any[]) {
    calls++;

    return validate.apply(this, args);
  };

  try {
    fn();
  } finally {
    Criterion.prototype.validate = validate;
  }

  return calls;
};

describe('terrainJob', (): void => {
  it('should keep the order of its criteria, with the extras last', (): void => {
    const { ruleRegistry, unit } = setUp(),
      me = player('me'),
      here = tile('here'),
      there = tile('there'),
      asked: [Tile, Function, Player][] = [],
      extra = new Criterion((): boolean => false);

    ruleRegistry.register(
      new Available(
        new Criterion(
          (on: Tile, Improvement: Function, owner: Player): boolean => {
            asked.push([on, Improvement, owner]);

            return Improvement === Ditch;
          }
        )
      )
    );

    const criteria = terrainJob({ ruleRegistry }, Ditch, extra),
      worker = unit(Unit, me, here, { traits: [Terraforms] });

    expect(criteria).length(5);
    expect(criteria[1]).equal(hasMovesLeft);
    expect(criteria[3]).equal(isCurrentTile);
    expect(criteria[4]).equal(extra);

    expect(firstFailing(criteria, unit(Unit, me, here), here)).equal(0);
    expect(
      firstFailing(
        criteria,
        unit(Unit, me, here, { traits: [Terraforms], moves: 0 }),
        here
      )
    ).equal(1);
    // `Available` is asked about `from` (the unit's tile unless given), for the improvement and the unit's player.
    expect(firstFailing(criteria, worker, there)).equal(3);
    expect(asked).deep.equal([[here, Ditch, me]]);
    expect(firstFailing(criteria, worker, here, there)).equal(3);
    expect(asked[1]).deep.equal([there, Ditch, me]);
    expect(firstFailing(criteria, worker, here)).equal(4);

    expect(
      firstFailing(terrainJob({ ruleRegistry }, Rail), worker, here)
    ).equal(2);
    expect(
      firstFailing(terrainJob({ ruleRegistry }, Ditch), worker, here)
    ).equal(-1);
  });

  it('should need any one `Available` rule', (): void => {
    const { ruleRegistry, unit } = setUp(),
      here = tile('here'),
      worker = unit(Unit, player('me'), here, { traits: [Terraforms] }),
      criteria = terrainJob({ ruleRegistry }, Ditch);

    expect(firstFailing(criteria, worker, here)).equal(2);

    ruleRegistry.register(
      new Available(new Criterion((): boolean => false)),
      new Available(new Criterion((): boolean => true))
    );

    expect(firstFailing(criteria, worker, here)).equal(-1);
  });

  it('should ask `requiresImprovement` about `to`', (): void => {
    const { tileImprovementRegistry, improve, unit } = setUp(),
      here = tile('here'),
      there = tile('there'),
      worker = unit(Unit, player('me'), here),
      criterion = requiresImprovement({ tileImprovementRegistry }, Track);

    expect(criterion.validate(worker, here)).false;

    improve(here, make(Ditch), make(Track));

    expect(criterion.validate(worker, here)).true;
    expect(criterion.validate(worker, there, here)).false;

    improve(there, make(Track));

    expect(criterion.validate(worker, there, here)).true;
  });
});

describe('terrainConversion', (): void => {
  it('should match any of the terrains, on `from`, after its other criteria', (): void => {
    const { unit } = setUp(),
      me = player('me'),
      open = tile('open', Open),
      wooded = tile('wooded', Wooded),
      marsh = tile('marsh', Marsh),
      criteria = terrainConversion([Open, Marsh]);

    expect(criteria).length(4);
    expect(criteria[0]).equal(hasMovesLeft);
    expect(criteria[1]).equal(isCurrentTile);

    expect(
      firstFailing(criteria, unit(Unit, me, open, { moves: 0 }), open)
    ).equal(0);
    expect(
      firstFailing(
        criteria,
        unit(Unit, me, open, { traits: [Terraforms] }),
        marsh
      )
    ).equal(1);
    expect(firstFailing(criteria, unit(Unit, me, open), open)).equal(2);
    expect(
      firstFailing(
        criteria,
        unit(Unit, me, open, { traits: [Terraforms] }),
        open
      )
    ).equal(-1);
    expect(
      firstFailing(
        criteria,
        unit(Unit, me, marsh, { traits: [Terraforms] }),
        marsh
      )
    ).equal(-1);
    expect(
      firstFailing(
        criteria,
        unit(Unit, me, wooded, { traits: [Terraforms] }),
        wooded
      )
    ).equal(3);
    // `from`, when given, rather than the unit's tile.
    expect(
      criteria[3].validate(
        unit(Unit, me, wooded, { traits: [Terraforms] }),
        open,
        open
      )
    ).true;
  });

  it('should add the extras last', (): void => {
    const { unit } = setUp(),
      open = tile('open', Open),
      extra = new Criterion((): boolean => false),
      criteria = terrainConversion([Open], extra);

    expect(criteria).length(5);
    expect(criteria[4]).equal(extra);
    expect(
      firstFailing(
        criteria,
        unit(Unit, player('me'), open, { traits: [Terraforms] }),
        open
      )
    ).equal(4);
  });
});

describe('cleanPollution', (): void => {
  it('should need the given improvement on `from`', (): void => {
    const { tileImprovementRegistry, improve, unit } = setUp(),
      me = player('me'),
      here = tile('here'),
      there = tile('there'),
      criteria = cleanPollution({ tileImprovementRegistry }, Smog),
      worker = unit(Unit, me, here, { traits: [Terraforms] });

    expect(criteria).length(4);
    expect(criteria[0]).equal(hasMovesLeft);
    expect(criteria[1]).equal(isCurrentTile);
    expect(firstFailing(criteria, unit(Unit, me, here), here)).equal(2);
    expect(firstFailing(criteria, worker, here)).equal(3);

    improve(here, make(Ditch));

    expect(firstFailing(criteria, worker, here)).equal(3);

    improve(here, make(Ditch), make(Smog));

    expect(firstFailing(criteria, worker, here)).equal(-1);
    // `from`, when given, rather than the unit's tile.
    expect(criteria[3].validate(worker, there, there)).false;
    expect(criteria[3].validate(worker, there, here)).true;
  });
});

describe('transport', (): void => {
  const scene = () => {
    const deps = setUp(),
      me = player('me'),
      them = player('them'),
      shore: StandInTile = tile('shore', Open, () => [sea, inland]),
      sea: StandInTile = tile('sea', Sea, () => [shore, ocean]),
      ocean: StandInTile = tile('ocean', Sea, () => [sea]),
      inland: StandInTile = tile('inland', Open, () => [shore]);

    return { ...deps, me, them, shore, sea, ocean, inland };
  };

  it('should let a land unit board its own transport with room on the water beside it', (): void => {
    const { me, them, shore, sea, inland, unit, ...deps } = scene(),
      { embarkCriteria } = transport(deps),
      soldier = unit(Land, me, shore);

    expect(embarkCriteria).length(6);
    expect(embarkCriteria[0]).equal(isNeighbouringTile);
    expect(embarkCriteria[1]).equal(hasMovesLeft);

    // Not to land, nor onto water with no transport.
    expect(firstFailing(embarkCriteria, soldier, inland)).equal(3);
    expect(firstFailing(embarkCriteria, soldier, sea)).equal(5);

    const ship = unit(NavalTransport, me, sea);

    expect(firstFailing(embarkCriteria, soldier, sea)).equal(-1);
    expect(firstFailing(embarkCriteria, unit(Naval, me, shore), sea)).equal(2);
    expect(firstFailing(embarkCriteria, unit(Air, me, shore), sea)).equal(2);
    expect(
      firstFailing(embarkCriteria, unit(Land, me, shore, { moves: 0 }), sea)
    ).equal(1);

    // Any foreign unit there refuses.
    unit(Naval, them, sea);

    expect(firstFailing(embarkCriteria, soldier, sea)).equal(4);
    expect(ship).not.undefined;
  });

  it('should need a transport with room that can carry the unit', (): void => {
    const { me, them, shore, sea, unit, ...deps } = scene(),
      { embarkCriteria } = transport(deps),
      soldier = unit(Land, me, shore);

    unit(Naval, me, sea);
    unit(NavalTransport, me, sea, { hasCapacity: false });
    unit(NavalTransport, me, sea, { canStow: false });

    expect(firstFailing(embarkCriteria, soldier, sea)).equal(5);

    unit(NavalTransport, me, sea);

    expect(firstFailing(embarkCriteria, soldier, sea)).equal(-1);
  });

  it('should ask `hasUnit` first, and only then the transport', (): void => {
    const { me, shore, sea, ocean, inland, asked, unit, board, ...deps } =
        scene(),
      { disembarkCriteria } = transport(deps),
      soldier = unit(Land, me, sea);

    expect(disembarkCriteria).length(5);
    expect(disembarkCriteria[0]).equal(isNeighbouringTile);

    // Not aboard: the one question asked is `hasUnit`, never `getByUnit` (which throws to say no).
    expect(firstFailing(disembarkCriteria, soldier, shore)).equal(1);
    expect(asked).deep.equal(['hasUnit']);

    const ship = unit(NavalTransport, me, sea);

    board(soldier, ship);

    expect(firstFailing(disembarkCriteria, soldier, shore)).equal(-1);
    // A land unit only onto land.
    expect(firstFailing(disembarkCriteria, soldier, sea)).equal(0);

    expect(firstFailing(disembarkCriteria, soldier, ocean)).equal(3);
    expect(
      leafCalls(() => disembarkCriteria[3].validate(soldier, ocean))
    ).equal(2);

    // Any other unit (not an aircraft) may leave onto water.
    const boat = unit(Naval, me, sea);

    board(boat, ship);

    expect(firstFailing(disembarkCriteria, boat, ocean)).equal(-1);

    // An aircraft never.
    const plane = unit(Air, me, sea);

    board(plane, ship);

    expect(firstFailing(disembarkCriteria, plane, shore)).equal(2);
    expect(inland).not.undefined;
  });

  it('should need the transport on `from`', (): void => {
    const { me, shore, sea, unit, board, ...deps } = scene(),
      { disembarkCriteria } = transport(deps),
      soldier = unit(Land, me, sea),
      ship = unit(NavalTransport, me, sea);

    board(soldier, ship);

    expect(disembarkCriteria[4].validate(soldier, shore)).true;
    expect(disembarkCriteria[4].validate(soldier, shore, sea)).true;
    expect(disembarkCriteria[4].validate(soldier, shore, shore)).false;
  });

  it('should unload a transport with cargo beside land, asking for cargo only of a transport', (): void => {
    const { me, shore, sea, ocean, unit, ...deps } = scene(),
      { unloadCriteria } = transport(deps);

    expect(unloadCriteria).length(5);
    expect(unloadCriteria[0]).equal(hasMovesLeft);
    expect(unloadCriteria[1]).equal(isCurrentTile);

    // A plain ship has no `hasCargo`: the type check comes first, so it's never asked.
    expect(firstFailing(unloadCriteria, unit(Naval, me, sea), sea)).equal(2);
    expect(
      firstFailing(unloadCriteria, unit(NavalTransport, me, sea), sea)
    ).equal(3);
    expect(
      firstFailing(
        unloadCriteria,
        unit(NavalTransport, me, sea, { hasCargo: true }),
        sea
      )
    ).equal(-1);
    expect(
      firstFailing(
        unloadCriteria,
        unit(NavalTransport, me, ocean, { hasCargo: true }),
        ocean
      )
    ).equal(4);
    expect(shore).not.undefined;
  });
});

describe('orders', (): void => {
  it('should share the core criteria for sleep, disband and no orders', (): void => {
    const { sleepCriteria, disbandCriteria, noOrdersCriteria } = orders(
      setUp()
    );

    expect(sleepCriteria).deep.equal([hasMovesLeft, isCurrentTile]);
    expect(disbandCriteria).deep.equal([hasMovesLeft, isCurrentTile]);
    expect(noOrdersCriteria).deep.equal([isCurrentTile]);
    // Each its own list, so a ruleset can change one without the others.
    expect(sleepCriteria).not.equal(disbandCriteria);
  });

  it('should fortify a unit that `Fortifies` on land', (): void => {
    const { unit, ...deps } = setUp(),
      { fortifyCriteria } = orders(deps),
      me = player('me'),
      here = tile('here'),
      sea = tile('sea', Sea);

    expect(fortifyCriteria).length(4);
    expect(fortifyCriteria[0]).equal(hasMovesLeft);
    expect(fortifyCriteria[1]).equal(isCurrentTile);
    expect(firstFailing(fortifyCriteria, unit(Land, me, here), here)).equal(2);
    expect(
      firstFailing(
        fortifyCriteria,
        unit(Land, me, here, { traits: [Fortifies] }),
        here
      )
    ).equal(-1);
    expect(
      firstFailing(
        fortifyCriteria,
        unit(Land, me, sea, { traits: [Fortifies] }),
        sea
      )
    ).equal(3);
    // `from`, when given, rather than the unit's tile.
    expect(
      fortifyCriteria[3].validate(
        unit(Land, me, sea, { traits: [Fortifies] }),
        here,
        here
      )
    ).true;
  });

  it('should wake a busy or fortified unit, but not cargo', (): void => {
    const { unit, improveUnit, ...deps } = setUp(),
      { activateCriteria } = orders(deps),
      me = player('me'),
      here = tile('here'),
      idle = unit(Land, me, here),
      sleeping = unit(Land, me, here, { busy: new Asleep() }),
      fortified = unit(Land, me, here),
      veteran = unit(Land, me, here),
      cargo = unit(Land, me, here, { busy: make(Stowed) }),
      fortifiedCargo = unit(Land, me, here, { busy: make(Stowed) });

    improveUnit(fortified, make(Fortified));
    improveUnit(veteran, make(Veteran));
    improveUnit(fortifiedCargo, make(Fortified));

    expect(activateCriteria).length(2);
    expect(activateCriteria[0]).equal(isCurrentTile);
    expect(firstFailing(activateCriteria, idle, here)).equal(1);
    expect(firstFailing(activateCriteria, sleeping, here)).equal(-1);
    expect(firstFailing(activateCriteria, fortified, here)).equal(-1);
    expect(firstFailing(activateCriteria, veteran, here)).equal(1);
    expect(firstFailing(activateCriteria, cargo, here)).equal(1);
    expect(firstFailing(activateCriteria, fortifiedCargo, here)).equal(1);
    // No moves needed.
    expect(
      firstFailing(
        activateCriteria,
        unit(Land, me, here, { busy: new Asleep(), moves: 0 }),
        here
      )
    ).equal(-1);
  });

  it('should found a city on land with no city', (): void => {
    const { unit, city, ...deps } = setUp(),
      { foundCityCriteria } = orders(deps),
      me = player('me'),
      here = tile('here'),
      there = tile('there'),
      sea = tile('sea', Sea),
      founder = (on: Tile) => unit(Land, me, on, { traits: [FoundsCities] });

    expect(foundCityCriteria).length(5);
    expect(foundCityCriteria[0]).equal(hasMovesLeft);
    expect(foundCityCriteria[1]).equal(isCurrentTile);
    expect(firstFailing(foundCityCriteria, unit(Land, me, here), here)).equal(
      2
    );
    expect(firstFailing(foundCityCriteria, founder(here), here)).equal(-1);
    expect(firstFailing(foundCityCriteria, founder(sea), sea)).equal(3);

    city(player('them'), there);

    expect(firstFailing(foundCityCriteria, founder(there), there)).equal(4);
    // `from`, when given, rather than the unit's tile.
    expect(foundCityCriteria[4].validate(founder(here), there, there)).false;
    expect(foundCityCriteria[3].validate(founder(sea), here, here)).true;
  });

  it('should join one of its own cities that every `CanJoinCity` rule allows', (): void => {
    const { unit, city, ruleRegistry, ...deps } = setUp(),
      { joinCityCriteria } = orders({ ruleRegistry, ...deps }),
      me = player('me'),
      here = tile('here'),
      there = tile('there'),
      founder = (on: Tile) => unit(Land, me, on, { traits: [FoundsCities] });

    expect(joinCityCriteria).length(4);
    expect(joinCityCriteria[0]).equal(hasMovesLeft);
    expect(joinCityCriteria[1]).equal(isCurrentTile);
    expect(firstFailing(joinCityCriteria, founder(here), here)).equal(3);

    city(me, here);
    city(player('them'), there);

    expect(firstFailing(joinCityCriteria, unit(Land, me, here), here)).equal(2);
    expect(firstFailing(joinCityCriteria, founder(here), here)).equal(-1);
    expect(firstFailing(joinCityCriteria, founder(there), there)).equal(3);
    // `from`, when given, rather than the unit's tile.
    expect(joinCityCriteria[3].validate(founder(there), here, here)).true;

    ruleRegistry.register(new CanJoinCity(new Effect((): boolean => false)));

    expect(firstFailing(joinCityCriteria, founder(here), here)).equal(3);
  });

  it("should set a home city only in one of the unit's player's cities, on `from` as given", (): void => {
    const { unit, city, ...deps } = setUp(),
      { setHomeCityCriteria } = orders(deps),
      me = player('me'),
      here = tile('here'),
      there = tile('there'),
      soldier = unit(Land, me, here);

    expect(setHomeCityCriteria).length(3);
    expect(setHomeCityCriteria[0]).equal(hasMovesLeft);
    expect(setHomeCityCriteria[1]).equal(isCurrentTile);
    expect(setHomeCityCriteria[2].validate(soldier, here, here)).false;

    city(me, here);
    city(player('them'), there);

    expect(setHomeCityCriteria[2].validate(soldier, here, here)).true;
    expect(setHomeCityCriteria[2].validate(soldier, there, there)).false;
    // No default for `from`: the rule is always asked with one.
    expect(setHomeCityCriteria[2].validate(soldier, here)).false;
  });

  it('should explore with a unit that `Fortifies` or a ship, and automate a unit that `Terraforms`', (): void => {
    const { unit, ...deps } = setUp(),
      { exploreCriteria, automateCriteria } = orders(deps),
      me = player('me'),
      here = tile('here');

    expect(exploreCriteria).length(3);
    expect(exploreCriteria[0]).equal(hasMovesLeft);
    expect(exploreCriteria[1]).equal(isCurrentTile);
    expect(
      firstFailing(
        exploreCriteria,
        unit(Land, me, here, { traits: [Fortifies] }),
        here
      )
    ).equal(-1);
    expect(firstFailing(exploreCriteria, unit(Naval, me, here), here)).equal(
      -1
    );
    expect(
      firstFailing(exploreCriteria, unit(NavalTransport, me, here), here)
    ).equal(-1);
    expect(firstFailing(exploreCriteria, unit(Land, me, here), here)).equal(2);
    expect(firstFailing(exploreCriteria, unit(Air, me, here), here)).equal(2);
    expect(
      firstFailing(
        exploreCriteria,
        unit(Land, me, here, { traits: [Terraforms] }),
        here
      )
    ).equal(2);

    expect(automateCriteria).length(3);
    expect(automateCriteria[0]).equal(hasMovesLeft);
    expect(automateCriteria[1]).equal(isCurrentTile);
    expect(
      firstFailing(
        automateCriteria,
        unit(Land, me, here, { traits: [Terraforms] }),
        here
      )
    ).equal(-1);
    expect(
      firstFailing(
        automateCriteria,
        unit(Land, me, here, { traits: [Fortifies] }),
        here
      )
    ).equal(2);
  });
});
