import {
  Air,
  Land,
  Naval,
  NavalTransport,
} from '@civ-clone/library-unit/Types';
import {
  attackCriteria,
  captureCityCriteria,
  hasAttack,
} from '../lib/criteria/attack';
import { atPeace, peaceCriteria, peaceExpired } from '../lib/criteria/peace';
import { isLandUnit, isNavalUnit, tileHasCity } from '../lib/criteria/domain';
import { overruled, treatyGate } from '../lib/criteria/treatyGate';
import Action from '@civ-clone/core-unit/Rules/Action';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Detonates from '@civ-clone/base-unit-trait-detonates/Detonates';
import Fortifies from '@civ-clone/base-unit-trait-fortifies/Fortifies';
import InteractionRegistry from '@civ-clone/core-diplomacy/InteractionRegistry';
import Interceptor from '@civ-clone/base-unit-trait-interceptor/Interceptor';
import NonCombatant from '@civ-clone/base-unit-trait-non-combatant/NonCombatant';
import { Overruled } from '@civ-clone/library-unit/Actions';
import { Peace } from '@civ-clone/library-diplomacy/Declarations';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Submerged from '@civ-clone/base-unit-trait-submerged/Submerged';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import domainMoveCriteria from '../lib/criteria/move';
import { expect } from 'chai';
import landing from '../lib/criteria/landing';
import nuclearCriteria from '../lib/criteria/nuclear';
import partnerCriteria from '../lib/criteria/partners';
import pillageCriteria from '../lib/criteria/pillage';

// Stand-ins: the criteria only ask a tile whether it's land or water, a unit for its player, tile, traits, attack and
// (a transport) room, and the registries for what's on a tile. Units are made from the real domain classes, so `isA` and
// `instanceof` see them as such.
type StandInTile = Tile & { name: string };
type UnitType = typeof Unit | typeof NavalTransport;

interface UnitOptions {
  attack?: number;
  canStow?: boolean;
  hasCapacity?: boolean;
  traits?: Function[];
}

const tile = (name: string, land: boolean = true): StandInTile =>
    ({
      name,
      isLand: (): boolean => land,
      isWater: (): boolean => !land,
    } as unknown as StandInTile),
  player = (name: string): Player => ({ name } as unknown as Player);

const setUp = () => {
  const units = new Map<Tile, Unit[]>(),
    cities = new Map<Tile, { player(): Player }>(),
    interactions: [Player, Player, Peace][] = [],
    improvements = new Map<Tile, TileImprovement[]>(),
    attacksAsked: Unit[] = [],
    unitRegistry = {
      getByTile: (tile: Tile): Unit[] => units.get(tile) ?? [],
    } as unknown as UnitRegistry,
    cityRegistry = {
      getByTile: (tile: Tile) => cities.get(tile) ?? null,
    } as unknown as CityRegistry,
    interactionRegistry = {
      getByPlayers: (a: Player, b: Player) =>
        interactions
          .filter(([x, y]) => (x === a && y === b) || (x === b && y === a))
          .map(([, , peace]) => peace),
    } as unknown as InteractionRegistry,
    tileImprovementRegistry = {
      getByTile: (tile: Tile): TileImprovement[] =>
        improvements.get(tile) ?? [],
    } as unknown as TileImprovementRegistry,
    unit = (
      Type: UnitType,
      owner: Player,
      on: Tile,
      {
        attack = 1,
        canStow = true,
        hasCapacity = true,
        traits = [],
      }: UnitOptions = {}
    ): Unit => {
      const unit = Object.assign(Object.create(Type.prototype), {
        player: (): Player => owner,
        tile: (): Tile => on,
        hasTrait: (Trait: Function): boolean => traits.includes(Trait),
        attack: () => {
          attacksAsked.push(unit);

          return { value: (): number => attack };
        },
        hasCapacity: (): boolean => hasCapacity,
        canStow: (): boolean => canStow,
      }) as Unit;

      units.set(on, [...(units.get(on) ?? []), unit]);

      return unit;
    },
    city = (owner: Player, on: Tile): void => {
      cities.set(on, { player: (): Player => owner });
    },
    // A `Peace` that is `active()` and `expired()` as given: independent, so the two checks can be told apart.
    peace = (a: Player, b: Player, active: boolean, expired: boolean): void => {
      interactions.push([
        a,
        b,
        Object.assign(Object.create(Peace.prototype), {
          active: (): boolean => active,
          expired: (): boolean => expired,
        }) as Peace,
      ]);
    },
    improve = (on: Tile, ...list: TileImprovement[]): void => {
      improvements.set(on, list);
    };

  return {
    attacksAsked,
    cityRegistry,
    interactionRegistry,
    tileImprovementRegistry,
    unitRegistry,
    unit,
    city,
    peace,
    improve,
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

// A unit with moves left, as `hasMovesLeft` asks, and neighbouring tiles, as `isNeighbouringTile` asks.
const ready = (unit: Unit): Unit =>
  Object.assign(unit, {
    moves: () => ({ value: (): number => 1 }),
  });

const neighbours = (...tiles: StandInTile[]): void => {
  tiles.forEach((tile: StandInTile): void => {
    Object.assign(tile, {
      isNeighbourOf: (other: Tile): boolean =>
        tiles.includes(other as StandInTile) && other !== tile,
    });
  });
};

describe('domain', (): void => {
  it('should tell the domains apart', (): void => {
    const { unit } = setUp(),
      here = tile('here'),
      me = player('me');

    expect(isLandUnit.validate(unit(Land, me, here), here)).true;
    expect(isLandUnit.validate(unit(Naval, me, here), here)).false;
    expect(isNavalUnit.validate(unit(Naval, me, here), here)).true;
    expect(isNavalUnit.validate(unit(NavalTransport, me, here), here)).true;
    expect(isNavalUnit.validate(unit(Air, me, here), here)).false;
  });

  it('should find a city on a tile', (): void => {
    const { city, cityRegistry } = setUp(),
      here = tile('here'),
      there = tile('there');

    city(player('me'), here);

    expect(tileHasCity(here, cityRegistry)).true;
    expect(tileHasCity(there, cityRegistry)).false;
  });
});

describe('peace', (): void => {
  it('should keep `atPeace` (active) and `peaceExpired` (expired) apart', (): void => {
    const { interactionRegistry, peace } = setUp(),
      me = player('me'),
      neither = player('neither'),
      both = player('both'),
      nobody = player('nobody');

    peace(me, neither, false, false);
    peace(me, both, true, true);

    const active = atPeace(interactionRegistry),
      expired = peaceExpired(interactionRegistry);

    expect(active(me, neither)).false;
    expect(expired(me, neither)).false;
    expect(active(me, both)).true;
    expect(expired(me, both)).true;
    // No peace at all: not at peace, and nothing left to expire.
    expect(active(me, nobody)).false;
    expect(expired(me, nobody)).true;
  });

  it('should need every peace to have expired, and any one to be active', (): void => {
    const { interactionRegistry, peace } = setUp(),
      me = player('me'),
      them = player('them');

    peace(me, them, true, false);
    peace(me, them, false, true);

    expect(atPeace(interactionRegistry)(me, them)).true;
    expect(peaceExpired(interactionRegistry)(me, them)).false;
  });

  it('should ask about every unit on `to`, and the owner of the city there', (): void => {
    const deps = setUp(),
      { city, peace, unit } = deps,
      me = player('me'),
      friend = player('friend'),
      foe = player('foe'),
      here = tile('here'),
      to = tile('to'),
      mover = unit(Land, me, here),
      criteria = peaceCriteria(deps);

    peace(me, friend, true, false);
    unit(Land, friend, to);
    city(friend, to);

    expect(criteria.allAtPeace.validate(mover, to)).true;
    expect(criteria.allPeaceExpired.validate(mover, to)).false;
    expect(criteria.peaceWithOwner.validate(mover, to)).true;
    expect(criteria.ownerPeaceExpired.validate(mover, to)).false;

    unit(Land, foe, to);

    expect(criteria.allAtPeace.validate(mover, to)).false;
    expect(criteria.allPeaceExpired.validate(mover, to)).false;

    city(foe, to);

    expect(criteria.peaceWithOwner.validate(mover, to)).false;
    expect(criteria.ownerPeaceExpired.validate(mover, to)).true;
  });
});

describe('attackCriteria', (): void => {
  const scene = () => {
    const deps = setUp(),
      me = player('me'),
      them = player('them'),
      from = tile('from'),
      to = tile('to'),
      sea = tile('sea', false);

    neighbours(from, to, sea);

    return { ...deps, me, them, from, to, sea };
  };

  it('should let a land unit attack a foreign land unit', (): void => {
    const { me, them, from, to, unit, ...deps } = scene(),
      attacker = ready(unit(Land, me, from));

    unit(Land, them, to);

    expect(all(attackCriteria(deps), attacker, to)).true;
  });

  it('should keep the order of its criteria', (): void => {
    const { me, them, from, to, unit, ...deps } = scene(),
      criteria = attackCriteria(deps);

    // 0 neighbouring, 1 moves, 2 not a `NonCombatant`, 3 not one that `Detonates`, 4 a foreign unit, 5 `canAttack`, 6 domain.
    expect(
      firstFailing(
        criteria,
        ready(unit(Land, me, from, { traits: [NonCombatant] })),
        to
      )
    ).equal(2);
    expect(
      firstFailing(
        criteria,
        ready(unit(Land, me, from, { traits: [Detonates] })),
        to
      )
    ).equal(3);
    expect(firstFailing(criteria, ready(unit(Land, me, from)), to)).equal(4);

    unit(Land, them, to);

    expect(
      firstFailing(criteria, ready(unit(Land, me, from, { attack: 0 })), to)
    ).equal(5);
    expect(
      firstFailing(
        criteria,
        ready(unit(Naval, me, from, { traits: [Submerged] })),
        to
      )
    ).equal(6);
  });

  it('should only ask for the attack once there is a foreign unit to attack', (): void => {
    const { attacksAsked, me, them, from, to, unit, ...deps } = scene(),
      criteria = attackCriteria(deps),
      attacker = ready(unit(Land, me, from));

    unit(Land, me, to);

    expect(all(criteria, attacker, to)).false;
    expect(attacksAsked).length(0);

    unit(Land, them, to);

    expect(all(criteria, attacker, to)).true;
    expect(attacksAsked).length(1);
  });

  it('should refuse a unit with no attack by default, and use `canAttack` when given', (): void => {
    const { me, them, from, to, unit, ...deps } = scene(),
      unarmed = ready(unit(Land, me, from, { attack: 0 })),
      asked: any[][] = [];

    unit(Land, them, to);

    expect(hasAttack(unarmed)).false;
    expect(all(attackCriteria(deps), unarmed, to)).false;
    expect(
      all(
        attackCriteria(deps, {
          canAttack: (...args: any[]): boolean => {
            asked.push(args);

            return true;
          },
        }),
        unarmed,
        to
      )
    ).true;
    expect(asked).eql([[unarmed, to]]);
  });

  it('should only let an `Interceptor` attack a tile of nothing but air units', (): void => {
    const { me, them, from, to, unit, ...deps } = scene(),
      criteria = attackCriteria(deps),
      plane = ready(unit(Air, me, from)),
      interceptor = ready(unit(Air, me, from, { traits: [Interceptor] }));

    unit(Air, them, to);

    expect(all(criteria, plane, to)).false;
    expect(all(criteria, interceptor, to)).true;

    unit(Land, them, to);

    expect(all(criteria, plane, to)).true;
  });

  it('should let a land unit attack only a city or a land unit', (): void => {
    const { city, me, them, from, to, unit, ...deps } = scene(),
      criteria = attackCriteria(deps),
      attacker = ready(unit(Land, me, from));

    unit(Air, them, to);

    expect(all(criteria, attacker, to)).false;

    city(them, to);

    expect(all(criteria, attacker, to)).true;
  });

  it('should let a `Submerged` unit attack only at sea', (): void => {
    const { me, them, from, to, sea, unit, ...deps } = scene(),
      criteria = attackCriteria(deps),
      submerged = ready(unit(Naval, me, from, { traits: [Submerged] })),
      ship = ready(unit(Naval, me, from));

    unit(Land, them, to);
    unit(Naval, them, sea);

    expect(all(criteria, submerged, to)).false;
    expect(all(criteria, ship, to)).true;
    expect(all(criteria, submerged, sea)).true;
  });

  it('should validate as many leaf criteria as the rule it was lifted from', (): void => {
    const { me, them, from, to, sea, unit, ...deps } = scene(),
      criteria = attackCriteria(deps),
      attacker = ready(unit(Land, me, from)),
      ship = ready(unit(Naval, me, from, { traits: [Submerged] }));

    unit(Land, them, to);
    unit(Naval, them, sea);

    // isNeighbouringTile, hasMovesLeft, 4 own leaves, Air (fails), Land, city (fails), land unit.
    expect(leafCalls(() => all(criteria, attacker, to))).equal(10);
    // ...Air (fails), Land (fails), Naval, not `Submerged` (fails), at sea.
    expect(leafCalls(() => all(criteria, ship, sea))).equal(11);
  });
});

describe('captureCityCriteria', (): void => {
  it('should let a land unit take an empty foreign city, in order', (): void => {
    const { city, unit, ...deps } = setUp(),
      me = player('me'),
      them = player('them'),
      from = tile('from'),
      to = tile('to'),
      criteria = captureCityCriteria(deps),
      soldier = ready(unit(Land, me, from)),
      envoy = ready(unit(Land, me, from, { traits: [NonCombatant] })),
      ship = ready(unit(Naval, me, from));

    neighbours(from, to);

    // 0 neighbouring, 1 moves, 2 land, 3 not a `NonCombatant`, 4 a city, 5 empty, 6 foreign.
    expect(firstFailing(criteria, ship, to)).equal(2);
    expect(firstFailing(criteria, envoy, to)).equal(3);
    expect(firstFailing(criteria, soldier, to)).equal(4);

    city(me, to);

    expect(firstFailing(criteria, soldier, to)).equal(6);

    city(them, to);

    expect(all(criteria, soldier, to)).true;

    unit(Land, them, to);

    expect(firstFailing(criteria, soldier, to)).equal(5);
  });
});

describe('nuclearCriteria', (): void => {
  it('should target each other player with a unit or a city on `to`, once', (): void => {
    const deps = setUp(),
      { city, unit } = deps,
      me = player('me'),
      a = player('a'),
      b = player('b'),
      from = tile('from'),
      to = tile('to'),
      { nuclearTargets } = nuclearCriteria(deps, (): boolean => false),
      nuke = unit(Air, me, from, { traits: [Detonates] });

    expect(nuclearTargets(nuke, to)).eql([]);

    unit(Land, me, to);

    expect(nuclearTargets(nuke, to)).eql([]);

    unit(Land, a, to);
    unit(Land, a, to);
    city(b, to);

    expect(nuclearTargets(nuke, to)).eql([a, b]);
  });

  it('should need a unit that `Detonates` and a target', (): void => {
    const deps = setUp(),
      { unit } = deps,
      me = player('me'),
      them = player('them'),
      from = tile('from'),
      to = tile('to'),
      { nuclearAttackCriteria } = nuclearCriteria(deps, (): boolean => false),
      nuke = ready(unit(Air, me, from, { traits: [Detonates] })),
      plane = ready(unit(Air, me, from));

    neighbours(from, to);

    expect(firstFailing(nuclearAttackCriteria, plane, to)).equal(2);
    expect(firstFailing(nuclearAttackCriteria, nuke, to)).equal(3);

    unit(Land, them, to);

    expect(all(nuclearAttackCriteria, nuke, to)).true;
  });

  it('should ask `atPeace` of each target', (): void => {
    const deps = setUp(),
      { unit } = deps,
      me = player('me'),
      friend = player('friend'),
      foe = player('foe'),
      from = tile('from'),
      to = tile('to'),
      asked: Player[][] = [],
      { noNuclearTargetAtPeace, anyNuclearTargetAtPeace } = nuclearCriteria(
        deps,
        (player: Player, other: Player): boolean => {
          asked.push([player, other]);

          return other === friend;
        }
      ),
      nuke = unit(Air, me, from, { traits: [Detonates] });

    unit(Land, foe, to);

    expect(noNuclearTargetAtPeace.validate(nuke, to)).true;
    expect(anyNuclearTargetAtPeace.validate(nuke, to)).false;
    expect(asked).eql([
      [me, foe],
      [me, foe],
    ]);

    unit(Land, friend, to);

    expect(noNuclearTargetAtPeace.validate(nuke, to)).false;
    expect(anyNuclearTargetAtPeace.validate(nuke, to)).true;
  });
});

describe('landing', (): void => {
  it('should land in its own city or on its own transport with room that can carry it', (): void => {
    const deps = setUp(),
      { city, unit } = deps,
      me = player('me'),
      them = player('them'),
      from = tile('from'),
      ownCity = tile('ownCity'),
      theirCity = tile('theirCity'),
      sea = tile('sea', false),
      { landsInCity, landingTransport, canLandAircraft } = landing(deps),
      plane = unit(Air, me, from),
      tank = unit(Land, me, from);

    city(me, ownCity);
    city(them, theirCity);

    expect(landsInCity(plane, ownCity)).true;
    expect(landsInCity(plane, theirCity)).false;
    expect(canLandAircraft(plane, ownCity)).true;
    expect(canLandAircraft(tank, ownCity)).false;
    expect(canLandAircraft(plane, sea)).false;

    unit(NavalTransport, them, sea);
    unit(NavalTransport, me, sea, { hasCapacity: false });
    unit(NavalTransport, me, sea, { canStow: false });
    unit(Naval, me, sea);

    expect(landingTransport(plane, sea)).null;
    expect(canLandAircraft(plane, sea)).false;

    const transport = unit(NavalTransport, me, sea),
      second = unit(NavalTransport, me, sea);

    expect(landingTransport(plane, sea)).equal(transport);
    expect(landingTransport(plane, sea)).not.equal(second);
    expect(canLandAircraft(plane, sea)).true;
  });
});

describe('domainMoveCriteria', (): void => {
  const scene = (zoneOfControl: Criterion = new Criterion(() => true)) => {
    const deps = setUp(),
      me = player('me'),
      them = player('them'),
      from = tile('from'),
      to = tile('to'),
      sea = tile('sea', false),
      port = tile('port'),
      criteria = domainMoveCriteria(deps, zoneOfControl);

    neighbours(from, to, sea, port);
    deps.city(me, port);

    return { ...deps, me, them, from, to, sea, port, criteria };
  };

  it('should move each domain where it can go', (): void => {
    const { criteria, me, from, to, sea, port, unit } = scene(),
      soldier = ready(unit(Land, me, from)),
      ship = ready(unit(Naval, me, sea)),
      plane = ready(unit(Air, me, from));

    expect(all(criteria, soldier, to)).true;
    expect(all(criteria, soldier, sea)).false;
    expect(all(criteria, ship, port)).true;
    expect(all(criteria, ship, to)).false;
    expect(all(criteria, ship, sea, port)).true;
    expect(all(criteria, ship, to, port)).false;
    expect(all(criteria, plane, sea)).true;
  });

  it('should ask the zone of control after the domain, with the same arguments', (): void => {
    const asked: any[][] = [],
      { criteria, me, from, to, sea, unit } = scene(
        new Criterion((...args: any[]): boolean => {
          asked.push(args);

          return false;
        })
      ),
      soldier = ready(unit(Land, me, from));

    expect(firstFailing(criteria, soldier, sea)).equal(2);
    expect(asked).length(0);
    expect(firstFailing(criteria, soldier, to)).equal(3);
    expect(firstFailing(criteria, soldier, to, from)).equal(3);
    expect(asked).eql([
      [soldier, to],
      [soldier, to, from],
    ]);
  });

  it('should refuse a foreign city or a foreign unit on `to`', (): void => {
    const { criteria, city, me, them, from, to, sea, unit } = scene(),
      plane = ready(unit(Air, me, from));

    city(them, to);

    expect(firstFailing(criteria, plane, to)).equal(4);

    unit(Naval, them, sea);

    expect(firstFailing(criteria, plane, sea)).equal(5);
  });

  it('should not let a land unit move onto a tile with a foreign unit', (): void => {
    const { criteria, me, them, from, to, unit } = scene(),
      soldier = ready(unit(Land, me, from));

    unit(Land, them, to);

    expect(firstFailing(criteria, soldier, to)).equal(2);
  });

  it('should validate as many leaf criteria as the rule it was lifted from', (): void => {
    const { criteria, me, from, to, sea, unit } = scene(),
      soldier = ready(unit(Land, me, from)),
      ship = ready(unit(Naval, me, sea));

    // isNeighbouringTile, hasMovesLeft, land + its 3, zone of control, no foreign city, no foreign unit.
    expect(leafCalls(() => all(criteria, soldier, to))).equal(9);
    // ...land (fails), naval, from water, to water (fails), to own city (fails), air (fails): no further.
    expect(leafCalls(() => all(criteria, ship, to))).equal(8);
  });
});

describe('partnerCriteria', (): void => {
  it('should only find a partner moving from land onto land with none of its own units there', (): void => {
    const { unit, ...deps } = setUp(),
      me = player('me'),
      partner = player('partner'),
      from = tile('from'),
      to = tile('to'),
      sea = tile('sea', false),
      asked: any[][] = [],
      {
        movePartner,
        onPartnersLand,
        offPartnersLand,
        pillagingPartnersLand,
        notPillagingPartnersLand,
      } = partnerCriteria(deps, (...args: any[]): Player | null => {
        asked.push(args);

        return partner;
      }),
      soldier = unit(Land, me, from),
      boat = unit(Land, me, sea);

    expect(movePartner(soldier, to)).equal(partner);
    expect(movePartner(soldier, to, sea)).null;
    expect(movePartner(boat, to)).null;
    expect(movePartner(soldier, sea)).null;
    expect(asked).eql([[soldier, to]]);
    expect(onPartnersLand.validate(soldier, to)).true;
    expect(offPartnersLand.validate(soldier, to)).false;
    expect(onPartnersLand.validate(soldier, to, sea)).false;
    expect(offPartnersLand.validate(soldier, to, sea)).true;

    unit(Land, me, to);

    expect(movePartner(soldier, to)).null;
    // Pillaging asks whose land it is, whoever is there.
    expect(pillagingPartnersLand.validate(soldier, to)).true;
    expect(notPillagingPartnersLand.validate(soldier, to)).false;
  });

  it('should find nobody where `partnerOf` finds nobody', (): void => {
    const { unit, ...deps } = setUp(),
      from = tile('from'),
      to = tile('to'),
      soldier = unit(Land, player('me'), from),
      criteria = partnerCriteria(deps, (): null => null);

    expect(criteria.movePartner(soldier, to)).null;
    expect(criteria.onPartnersLand.validate(soldier, to)).false;
    expect(criteria.offPartnersLand.validate(soldier, to)).true;
    expect(criteria.pillagingPartnersLand.validate(soldier, to)).false;
    expect(criteria.notPillagingPartnersLand.validate(soldier, to)).true;
  });
});

describe('pillageCriteria', (): void => {
  class Kept extends TileImprovement {}
  class Lost extends TileImprovement {}

  it('should let a unit that `Fortifies` or `Terraforms`, and isn’t a `NonCombatant`, pillage what `pillageable` allows', (): void => {
    const { improve, unit, ...deps } = setUp(),
      me = player('me'),
      here = tile('here'),
      asked: TileImprovement[] = [],
      criteria = pillageCriteria(
        deps,
        (improvement: TileImprovement): boolean => {
          asked.push(improvement);

          return improvement instanceof Lost;
        }
      ),
      soldier = ready(unit(Land, me, here, { traits: [Fortifies] })),
      worker = ready(unit(Land, me, here, { traits: [Terraforms] })),
      envoy = ready(
        unit(Land, me, here, { traits: [Fortifies, NonCombatant] })
      ),
      other = ready(unit(Land, me, here)),
      kept = Object.create(Kept.prototype),
      lost = Object.create(Lost.prototype);

    // 0 moves, 1 current tile, 2 `Fortifies` or `Terraforms`, 3 not a `NonCombatant`, 4 something to pillage.
    expect(firstFailing(criteria, other, here)).equal(2);
    expect(firstFailing(criteria, envoy, here)).equal(3);
    expect(firstFailing(criteria, soldier, here)).equal(4);

    improve(here, kept);

    expect(firstFailing(criteria, soldier, here)).equal(4);

    improve(here, kept, lost);

    expect(all(criteria, soldier, here)).true;
    expect(all(criteria, worker, here)).true;
    expect(asked).eql([kept, kept, lost, kept, lost]);
  });
});

describe('treatyGate', (): void => {
  it('should split on `hasSenate`, asking it each time', (): void => {
    const asked: Player[] = [],
      senate = player('senate'),
      free = player('free'),
      { isFree, isOverruled } = treatyGate((player: Player): boolean => {
        asked.push(player);

        return player === senate;
      }),
      ownedBy = (owner: Player): Unit =>
        ({ player: (): Player => owner } as unknown as Unit);

    expect(isFree.validate(ownedBy(free))).true;
    expect(isOverruled.validate(ownedBy(free))).false;
    expect(isFree.validate(ownedBy(senate))).false;
    expect(isOverruled.validate(ownedBy(senate))).true;
    expect(asked).eql([free, free, senate, senate]);
  });

  it('should build an overruled action with its id, the criteria, then `isOverruled`', (): void => {
    const ruleRegistry = new RuleRegistry(),
      order: string[] = [],
      named = (name: string, result: boolean = true): Criterion =>
        new Criterion((): boolean => {
          order.push(name);

          return result;
        }),
      build = overruled({
        id: (name: string): string => `ruleset:overruled/${name}`,
        isOverruled: named('isOverruled'),
        ruleRegistry,
      }),
      blockedWith: any[][] = [],
      blockedAction = { name: 'blocked' } as unknown as UnitAction,
      action = build(
        'sneak-thing',
        (...args: any[]): UnitAction => {
          blockedWith.push(args);

          return blockedAction;
        },
        named('first'),
        named('second')
      ),
      here = tile('here'),
      there = tile('there'),
      mover = { tile: (): Tile => here } as unknown as Unit;

    expect(action).instanceof(Action);
    expect(action.id()).equal('ruleset:overruled/sneak-thing');
    expect(action.validate(mover, there)).true;
    expect(order).eql(['first', 'second', 'isOverruled']);

    const result = action.process(mover, there) as Overruled;

    expect(result).instanceof(Overruled);
    expect(result.action()).equal(blockedAction);
    expect(result.moves()).equal(0);
    expect(result.from()).equal(here);
    expect(result.to()).equal(there);
    expect(result.unit()).equal(mover);
    expect(result.ruleRegistry()).equal(ruleRegistry);
    // `from` defaults to the unit's tile, and is passed to `blocked` as given otherwise.
    expect(blockedWith).eql([[mover, there, here]]);

    action.process(mover, there, there);

    expect(blockedWith[1]).eql([mover, there, there]);
  });
});
