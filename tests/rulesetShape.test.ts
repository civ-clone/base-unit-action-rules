import { ActionRow, actionRules } from '../lib/actionRules';
import UnitTraits, { unitTraits } from '@civ-clone/core-unit/Rules/UnitTraits';
import Action from '@civ-clone/core-unit/Rules/Action';
import City from '@civ-clone/core-city/City';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import Fortifies from '@civ-clone/base-unit-trait-fortifies/Fortifies';
import IgnoresZoneOfControl from '@civ-clone/base-unit-trait-ignores-zone-of-control/IgnoresZoneOfControl';
import { Land } from '@civ-clone/library-unit/Types';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import TileImprovementRegistry from '@civ-clone/core-tile-improvement/TileImprovementRegistry';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import domainMoveCriteria from '../lib/criteria/move';
import { expect } from 'chai';
import { isA } from '@civ-clone/core-unit/traits';
import partnerCriteria from '../lib/criteria/partners';
import pillageCriteria from '../lib/criteria/pillage';
import { placeActions } from '../lib/placeActions';
import zoneOfControl from '@civ-clone/base-zone-of-control/lib/zoneOfControl';

// A ruleset built from these pieces: its own unit types and traits, a zone of control that a unit
//  with `IgnoresZoneOfControl` passes, no Senate, its own list of what can be pillaged, its rows in its own order, and a
//  plugin's action placed among them.
class Footman extends Land {}
class Scout extends Land {}
class Engineer extends Land {}
class Farmland extends TileImprovement {}
class Track extends TileImprovement {}

const make = <T>(Type: Function, properties: object = {}): T =>
  Object.assign(Object.create(Type.prototype), properties) as T;

const setUp = () => {
  const ruleRegistry = new RuleRegistry(),
    units = new Map<Tile, Unit[]>(),
    improvements = new Map<Tile, TileImprovement[]>(),
    neighbours = new Map<Tile, Tile[]>(),
    unitRegistry = {
      getByTile: (tile: Tile): Unit[] => units.get(tile) ?? [],
    } as unknown as UnitRegistry,
    cityRegistry = {
      getByTile: (): City | null => null,
    } as unknown as CityRegistry,
    tileImprovementRegistry = {
      getByTile: (tile: Tile): TileImprovement[] =>
        improvements.get(tile) ?? [],
    } as unknown as TileImprovementRegistry,
    tile = (name: string): Tile => {
      const made = {
        name,
        isLand: (): boolean => true,
        isWater: (): boolean => false,
        getNeighbours: (): Tile[] => neighbours.get(made) ?? [],
        isNeighbourOf: (other: Tile): boolean =>
          (neighbours.get(made) ?? []).includes(other),
      } as unknown as Tile;

      return made;
    },
    tiles: { [name: string]: Tile } = {},
    link = (a: Tile, b: Tile): void => {
      neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
      neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
    },
    // A unit of a real type, whose traits are its type's `UnitTraits` rules in `ruleRegistry`.
    unit = (Type: typeof Unit, owner: Player, on: Tile): Unit => {
      const unit = make<Unit>(Type, {
        _ruleRegistry: ruleRegistry,
        player: (): Player => owner,
        tile: (): Tile => on,
        moves: () => ({ value: (): number => 1 }),
      });

      units.set(on, [...(units.get(on) ?? []), unit]);

      return unit;
    },
    us = { name: 'us' } as unknown as Player,
    them = { name: 'them' } as unknown as Player,
    partner = { name: 'partner' } as unknown as Player;

  ['from', 'to', 'enemy', 'partnersLand', 'farm', 'road'].forEach(
    (name: string): void => {
      tiles[name] = tile(name);
    }
  );

  // `enemy` borders both `from` and `to`, so a unit of `them` there holds back a move between them.
  link(tiles.from, tiles.to);
  link(tiles.from, tiles.enemy);
  link(tiles.to, tiles.enemy);
  link(tiles.from, tiles.partnersLand);

  improvements.set(tiles.farm, [new Farmland()]);
  improvements.set(tiles.road, [new Track()]);

  ruleRegistry.register(
    ...unitTraits('ruleset:unit/trait', Footman, Fortifies),
    ...unitTraits('ruleset:unit/trait', Scout, Fortifies, IgnoresZoneOfControl),
    ...unitTraits('ruleset:unit/trait', Engineer, Terraforms)
  );

  const moveCriteria = domainMoveCriteria(
      { cityRegistry, unitRegistry },
      zoneOfControl(unitRegistry, {
        exemptMovers: [
          (mover: Unit): boolean => !isA(mover, Land),
          (mover: Unit): boolean => mover.hasTrait(IgnoresZoneOfControl),
        ],
        exerts: (other: Unit, mover: Unit): boolean =>
          isA(other, Land) && other.player() !== mover.player(),
        exemptMoves: [],
      })
    ),
    { onPartnersLand } = partnerCriteria(
      { unitRegistry },
      (mover: Unit, on: Tile): Player | null =>
        on === tiles.partnersLand ? partner : null
    ),
    performs = (name: string) => (): UnitAction =>
      ({ name } as unknown as UnitAction),
    table: ActionRow[] = [
      // Breaking the treaty first, then the ordinary move (the other way round from the usual), and both offered onto a
      //  partner's land.
      {
        name: 'sneak-move',
        criteria: [onPartnersLand, ...moveCriteria],
        effect: performs('sneak-move'),
        breaksTreaty: { blocked: performs('sneak-move') },
      },
      { name: 'move', criteria: [...moveCriteria], effect: performs('move') },
      {
        name: 'pillage',
        criteria: pillageCriteria(
          { tileImprovementRegistry },
          (improvement: TileImprovement): boolean =>
            improvement instanceof Farmland
        ),
        effect: performs('pillage'),
      },
    ];

  ruleRegistry.register(...actionRules('ruleset', table, { ruleRegistry }));

  const offered = (
    mover: Unit,
    to: Tile,
    from: Tile = mover.tile()
  ): string[] =>
    (
      ruleRegistry.process(Action, mover, to, from) as unknown as {
        name: string;
      }[]
    ).map(({ name }) => name);

  return { offered, ruleRegistry, them, tiles, unit, us };
};

describe('a ruleset built with actionRules', (): void => {
  it('has its own rows, in its own order, and no overruled forms without a Senate', (): void => {
    const { ruleRegistry } = setUp();

    expect(ruleRegistry.get(Action).map((rule) => rule.id())).to.deep.equal([
      'ruleset:unit/action/sneak-move',
      'ruleset:unit/action/move',
      'ruleset:unit/action/pillage',
    ]);
    // The trait rules are real: the units below get their traits from them.
    expect(ruleRegistry.get(UnitTraits)).to.have.length(4);
  });

  it('lets a land unit that ignores zones of control pass between two squares an enemy borders, and no other', (): void => {
    const { offered, them, tiles, unit, us } = setUp(),
      footman = unit(Footman, us, tiles.from),
      scout = unit(Scout, us, tiles.from);

    // With no enemy beside them, both may move.
    expect(offered(footman, tiles.to)).to.deep.equal(['move']);
    expect(offered(scout, tiles.to)).to.deep.equal(['move']);

    unit(Footman, them, tiles.enemy);

    expect(offered(scout, tiles.to)).to.deep.equal(['move']);
    expect(offered(footman, tiles.to)).to.deep.equal([]);
  });

  it("offers its rows in its own order: onto a partner's land, breaking the treaty first", (): void => {
    const { offered, tiles, unit, us } = setUp();

    expect(
      offered(unit(Footman, us, tiles.from), tiles.partnersLand)
    ).to.deep.equal(['sneak-move', 'move']);
  });

  it('pillages only what its own list says', (): void => {
    const { offered, tiles, unit, us } = setUp();

    expect(
      offered(unit(Engineer, us, tiles.farm), tiles.farm, tiles.farm)
    ).to.deep.equal(['pillage']);
    expect(
      offered(unit(Engineer, us, tiles.road), tiles.road, tiles.road)
    ).to.deep.equal([]);
  });

  it("offers a plugin's action where it was placed", (): void => {
    const { offered, ruleRegistry, tiles, unit, us } = setUp();

    placeActions(
      ruleRegistry,
      { before: 'ruleset:unit/action/move' },
      new Action(
        'plugin:unit/action/scout-ahead',
        new Criterion((mover: Unit): boolean => mover instanceof Scout),
        new Effect((): UnitAction => ({ name: 'scout-ahead' } as never))
      )
    );

    expect(ruleRegistry.get(Action).map((rule) => rule.id())).to.deep.equal([
      'ruleset:unit/action/sneak-move',
      'plugin:unit/action/scout-ahead',
      'ruleset:unit/action/move',
      'ruleset:unit/action/pillage',
    ]);
    expect(
      offered(unit(Scout, us, tiles.from), tiles.partnersLand)
    ).to.deep.equal(['sneak-move', 'scout-ahead', 'move']);
  });
});
