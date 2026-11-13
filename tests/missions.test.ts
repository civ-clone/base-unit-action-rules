import {
  bribeUnitCriteria,
  canIncite,
  canSteal,
  diplomat,
  hasNoEmbassy,
} from '../lib/criteria/diplomat';
import City from '@civ-clone/core-city/City';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import DiplomaticMissions from '@civ-clone/base-unit-trait-diplomatic-missions/DiplomaticMissions';
import Embassy from '@civ-clone/base-unit-action-establish-embassy/Embassy';
import Interaction from '@civ-clone/core-diplomacy/Interaction';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import TradeMissions from '@civ-clone/base-unit-trait-trade-missions/TradeMissions';
import Unit from '@civ-clone/core-unit/Unit';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import { expect } from 'chai';
import tradeRoute from '../lib/criteria/tradeRoute';

// Stand-ins: the criteria ask a tile whether it's land and what neighbours it, a unit for its player, tile, home city,
// traits and moves, a city for its player, and the registries for what's on a tile and who has an embassy with whom.
type StandInTile = Tile & { name: string };

interface UnitOptions {
  home?: City | null;
  traits?: Function[];
}

const tile = (name: string, land: boolean = true): StandInTile =>
    ({
      name,
      isLand: (): boolean => land,
      isWater: (): boolean => !land,
      isNeighbourOf: (): boolean => false,
    } as unknown as StandInTile),
  player = (name: string): Player => ({ name } as unknown as Player),
  neighbours = (...tiles: StandInTile[]): void => {
    tiles.forEach((tile: StandInTile): void => {
      Object.assign(tile, {
        isNeighbourOf: (other: Tile): boolean =>
          tiles.includes(other as StandInTile) && other !== tile,
      });
    });
  };

const setUp = () => {
  const units = new Map<Tile, Unit[]>(),
    cities = new Map<Tile, City>(),
    interactions: Interaction[] = [],
    asked: string[] = [],
    unitRegistry = {
      getByTile: (tile: Tile): Unit[] => units.get(tile) ?? [],
    } as unknown as UnitRegistry,
    cityRegistry = {
      getByTile: (tile: Tile): City | null => cities.get(tile) ?? null,
    } as unknown as CityRegistry,
    interactionRegistry = {
      getByPlayers: (a: Player, b: Player): Interaction[] => {
        asked.push('getByPlayers');

        return interactions.filter((interaction: Interaction): boolean =>
          [a, b].every((player: Player): boolean =>
            (interaction as unknown as { between: Player[] }).between.includes(
              player
            )
          )
        );
      },
    } as unknown as InteractionRegistry,
    unit = (
      owner: Player,
      on: Tile,
      { home = null, traits = [] }: UnitOptions = {}
    ): Unit => {
      const unit = Object.assign(Object.create(Unit.prototype), {
        player: (): Player => owner,
        tile: (): Tile => on,
        city: (): City | null => home,
        hasTrait: (Trait: Function): boolean => traits.includes(Trait),
        moves: () => ({ value: (): number => 1 }),
      }) as Unit;

      units.set(on, [...(units.get(on) ?? []), unit]);

      return unit;
    },
    city = (owner: Player, on: Tile): City => {
      const city = Object.assign(Object.create(City.prototype), {
        player: (): Player => owner,
        tile: (): Tile => on,
      }) as City;

      cities.set(on, city);

      return city;
    },
    // An interaction between `holder` and `host`: an `Embassy` held by `holder`, or some other kind.
    interaction = (
      holder: Player,
      host: Player,
      isEmbassy: boolean = true
    ): void => {
      interactions.push(
        Object.assign(
          Object.create((isEmbassy ? Embassy : Interaction).prototype),
          {
            between: [holder, host],
            holder: (): Player => holder,
          }
        ) as Interaction
      );
    };

  return {
    asked,
    cityRegistry,
    interactionRegistry,
    unitRegistry,
    unit,
    city,
    interaction,
  };
};

// Every criterion in `criteria`, in order, holds.
const all = (criteria: Criterion[], ...args: any[]): boolean =>
  criteria.every((criterion: Criterion): boolean =>
    criterion.validate(...args)
  );

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

const scene = () => {
  const deps = setUp(),
    me = player('me'),
    them = player('them'),
    from = tile('from'),
    to = tile('to'),
    sea = tile('sea', false),
    far = tile('far');

  neighbours(from, to, sea);

  return { ...deps, me, them, from, to, sea, far };
};

describe('diplomat', (): void => {
  it('should find a foreign city for a unit with `DiplomaticMissions` on land', (): void => {
    const { city, me, them, from, to, sea, unit, ...deps } = scene(),
      { diplomatCity } = diplomat(deps),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      afloat = unit(me, sea, { traits: [DiplomaticMissions] }),
      soldier = unit(me, from);

    expect(diplomatCity(envoy, to)).null;

    const target = city(them, to);

    expect(diplomatCity(envoy, to)).equal(target);
    expect(diplomatCity(soldier, to)).null;
    // Not from the sea: `from` is the unit's tile unless given.
    expect(diplomatCity(afloat, to)).null;
    expect(diplomatCity(afloat, to, from)).equal(target);
    expect(diplomatCity(envoy, to, sea)).null;

    city(me, to);

    expect(diplomatCity(envoy, to)).null;
  });

  it('should keep the order of its criteria, and pass `from` on', (): void => {
    const { city, me, them, from, to, sea, far, unit, ...deps } = scene(),
      { diplomatCriteria } = diplomat(deps),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      tired = Object.assign(unit(me, from, { traits: [DiplomaticMissions] }), {
        moves: () => ({ value: (): number => 0 }),
      });

    city(them, to);
    city(them, far);

    // 0 neighbouring, 1 moves, 2 a foreign city from land.
    expect(firstFailing(diplomatCriteria, envoy, far)).equal(0);
    expect(firstFailing(diplomatCriteria, tired, to)).equal(1);
    expect(firstFailing(diplomatCriteria, envoy, to, sea)).equal(2);
    expect(all(diplomatCriteria, envoy, to)).true;
    expect(leafCalls(() => all(diplomatCriteria, envoy, to))).equal(3);
  });

  it('should ask `canStealFrom` about the city on `to`', (): void => {
    const { city, me, them, from, to, unit, ...deps } = scene(),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      target = city(them, to),
      asked: any[][] = [];
    let answer = true;

    const criterion = canSteal(deps, (...args: any[]): boolean => {
      asked.push(args);

      return answer;
    });

    expect(criterion.validate(envoy, to)).true;

    answer = false;

    expect(criterion.validate(envoy, to)).false;
    expect(asked).eql([
      [envoy, target],
      [envoy, target],
    ]);
  });

  it("should only refuse an embassy the unit's player already holds with the city's owner", (): void => {
    const { city, interaction, me, them, from, to, unit, ...deps } = scene(),
      other = player('other'),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      criterion = hasNoEmbassy(deps);

    city(them, to);

    expect(criterion.validate(envoy, to)).true;

    // Theirs with us, another kind of interaction, and ours with someone else don't count.
    interaction(them, me);
    interaction(me, them, false);
    interaction(me, other);

    expect(criterion.validate(envoy, to)).true;

    interaction(me, them);

    expect(criterion.validate(envoy, to)).false;
  });

  it('should refuse to incite a capital, as `isCapital` says', (): void => {
    const { city, me, them, from, to, unit, ...deps } = scene(),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      target = city(them, to),
      asked: City[] = [];
    let capital = false;

    const criterion = canIncite(deps, (city: City): boolean => {
      asked.push(city);

      return capital;
    });

    expect(criterion.validate(envoy, to)).true;

    capital = true;

    expect(criterion.validate(envoy, to)).false;
    expect(asked).eql([target, target]);
  });

  it('should only bribe a lone foreign unit outside a city, in order', (): void => {
    const { city, me, them, from, to, sea, far, unit, ...deps } = scene(),
      criteria = bribeUnitCriteria(deps),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      afloat = unit(me, sea, { traits: [DiplomaticMissions] }),
      soldier = unit(me, from),
      tired = Object.assign(unit(me, from, { traits: [DiplomaticMissions] }), {
        moves: () => ({ value: (): number => 0 }),
      });

    // 0 neighbouring, 1 moves, 2 `DiplomaticMissions`, 3 from land, 4 no city, 5 one foreign unit.
    expect(firstFailing(criteria, envoy, far)).equal(0);
    expect(firstFailing(criteria, tired, to)).equal(1);
    expect(firstFailing(criteria, soldier, to)).equal(2);
    expect(firstFailing(criteria, afloat, to)).equal(3);
    expect(firstFailing(criteria, afloat, to, from)).equal(5);
    expect(firstFailing(criteria, envoy, to, sea)).equal(3);
    expect(firstFailing(criteria, envoy, to)).equal(5);

    unit(me, to);

    expect(firstFailing(criteria, envoy, to)).equal(5);

    const lone = tile('lone');

    neighbours(from, lone);
    unit(them, lone);

    expect(all(criteria, envoy, lone)).true;
    expect(leafCalls(() => all(criteria, envoy, lone))).equal(6);

    unit(them, lone);

    expect(firstFailing(criteria, envoy, lone)).equal(5);

    const garrison = tile('garrison');

    neighbours(from, garrison);
    unit(them, garrison);
    city(them, garrison);

    expect(firstFailing(criteria, envoy, garrison)).equal(4);
  });

  it('should have no peace check: none of its criteria asks about interactions', (): void => {
    const { asked, interaction, me, them, from, unit, ...deps } = scene(),
      criteria = bribeUnitCriteria(deps),
      envoy = unit(me, from, { traits: [DiplomaticMissions] }),
      lone = tile('lone');

    neighbours(from, lone);
    unit(them, lone);
    interaction(me, them, false);

    expect(all(criteria, envoy, lone)).true;
    expect(asked).eql([]);
  });
});

describe('tradeRoute', (): void => {
  const routes = () => {
    const deps = scene(),
      asked: [City, City][] = [];
    let answer = true;

    const route = tradeRoute(deps, {
      qualifies: (home: City, city: City): boolean => {
        asked.push([home, city]);

        return answer;
      },
    });

    return {
      ...deps,
      ...route,
      asked,
      answer: (value: boolean): void => {
        answer = value;
      },
    };
  };

  it('should take any foreign city, but not from the sea, without asking `qualifies`', (): void => {
    const {
        asked,
        canEstablishTradeRoute,
        city,
        me,
        them,
        from,
        to,
        sea,
        far,
        unit,
      } = routes(),
      home = city(me, far),
      caravan = unit(me, from, { home, traits: [TradeMissions] }),
      afloat = unit(me, sea, { home, traits: [TradeMissions] });

    city(them, to);

    expect(canEstablishTradeRoute(caravan, to)).true;
    expect(canEstablishTradeRoute(afloat, to)).false;
    // `from` is the unit's tile unless given.
    expect(canEstablishTradeRoute(afloat, to, from)).true;
    expect(canEstablishTradeRoute(caravan, to, sea)).false;
    expect(asked).eql([]);
  });

  it('should need `TradeMissions`, a home city and a city on `to`, and never take its home, without asking `qualifies`', (): void => {
    const { asked, canEstablishTradeRoute, city, me, from, to, far, unit } =
        routes(),
      home = city(me, far),
      caravan = unit(me, from, { home, traits: [TradeMissions] }),
      homeless = unit(me, from, { traits: [TradeMissions] }),
      soldier = unit(me, from, { home });

    expect(canEstablishTradeRoute(caravan, to)).false;

    city(me, to);

    expect(canEstablishTradeRoute(homeless, to)).false;
    expect(canEstablishTradeRoute(soldier, to)).false;
    expect(canEstablishTradeRoute(caravan, far)).false;
    expect(asked).eql([]);
  });

  it("should ask `qualifies` about the home city and one of its own player's others", (): void => {
    const {
        answer,
        asked,
        canEstablishTradeRoute,
        city,
        me,
        from,
        to,
        sea,
        far,
        unit,
      } = routes(),
      home = city(me, far),
      caravan = unit(me, from, { home, traits: [TradeMissions] }),
      target = city(me, to);

    expect(canEstablishTradeRoute(caravan, to)).true;
    // From the sea too: only a foreign city needs land.
    expect(canEstablishTradeRoute(caravan, to, sea)).true;

    answer(false);

    expect(canEstablishTradeRoute(caravan, to)).false;
    expect(asked).eql([
      [home, target],
      [home, target],
      [home, target],
    ]);
  });

  it('should keep the order of its criteria, and pass `from` on', (): void => {
    const { city, me, them, from, to, sea, far, unit, tradeRouteCriteria } =
        routes(),
      home = city(me, far),
      caravan = unit(me, from, { home, traits: [TradeMissions] }),
      tired = Object.assign(unit(me, from, { home, traits: [TradeMissions] }), {
        moves: () => ({ value: (): number => 0 }),
      });

    city(them, to);

    // 0 neighbouring, 1 moves, 2 `canEstablishTradeRoute`.
    expect(firstFailing(tradeRouteCriteria, caravan, far)).equal(0);
    expect(firstFailing(tradeRouteCriteria, tired, to)).equal(1);
    expect(firstFailing(tradeRouteCriteria, caravan, to, sea)).equal(2);
    expect(all(tradeRouteCriteria, caravan, to)).true;
    expect(leafCalls(() => all(tradeRouteCriteria, caravan, to))).equal(3);
  });
});
