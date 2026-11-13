import {
  AnchorPriorityError,
  UnknownAnchorError,
  placeActions,
} from '../lib/placeActions';
import { ActionRow, actionId, actionRules } from '../lib/actionRules';
import { High, Low } from '@civ-clone/core-rule/Priorities';
import Action from '@civ-clone/core-unit/Rules/Action';
import Available from '@civ-clone/core-tile-improvement/Rules/Available';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import { Land } from '@civ-clone/library-unit/Types';
import { Overruled } from '@civ-clone/library-unit/Actions';
import Player from '@civ-clone/core-player/Player';
import Rule from '@civ-clone/core-rule/Rule';
import RuleRegistry, {
  DuplicateRuleIdError,
} from '@civ-clone/core-rule/RuleRegistry';
import Terraforms from '@civ-clone/base-unit-trait-terraforms/Terraforms';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import TileImprovement from '@civ-clone/core-tile-improvement/TileImprovement';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
import { expect } from 'chai';

// Stand-ins: a unit answers for its player, tile, moves and traits; a tile for its terrain. Actions are made from real
//  classes with no constructor run, and effects return a marker naming what they built.
class Ditch extends TileImprovement {}
class DigDitch extends UnitAction {}
class Wooded extends Terrain {}
class Open extends Terrain {}
class Fell extends UnitAction {}
class Note extends Rule {}

const make = <T>(Type: Function, properties: object = {}): T =>
    Object.assign(Object.create(Type.prototype), properties) as T,
  tile = (TerrainType: typeof Terrain = Open): Tile => {
    const terrain = make<Terrain>(TerrainType);

    return { terrain: (): Terrain => terrain } as unknown as Tile;
  },
  player = (name: string): Player => ({ name } as unknown as Player),
  unit = (owner: Player, on: Tile, traits: Function[] = []): Unit =>
    make<Unit>(Land, {
      player: (): Player => owner,
      tile: (): Tile => on,
      hasTrait: (Trait: Function): boolean => traits.includes(Trait),
      moves: () => ({ value: (): number => 1 }),
    }),
  marker = (name: string): UnitAction => ({ name } as unknown as UnitAction),
  // A criterion that records its label in `calls` and answers `result`.
  recorder = (
    calls: string[],
    label: string,
    result: () => boolean = () => true
  ) =>
    new Criterion((): boolean => {
      calls.push(label);

      return result();
    }),
  ids = (rules: Rule[]): (string | null)[] =>
    rules.map((rule: Rule): string | null => rule.id());

describe('actionRules', (): void => {
  it('names each rule `<prefix>:unit/action/…`, by kind of row', (): void => {
    const rules = actionRules(
      'ruleset',
      [
        { name: 'move', criteria: [], effect: () => marker('move') },
        {
          name: 'sneak-move',
          criteria: [],
          effect: () => marker('sneak-move'),
          breaksTreaty: { blocked: () => marker('sneak-move') },
        },
        // The improvement's name, not the action's.
        { improvement: Ditch, effect: () => marker('ditch') },
        // The action's name, not the terrain's.
        { conversion: Fell, terrains: [Wooded], effect: () => marker('fell') },
      ],
      { ruleRegistry: new RuleRegistry(), hasSenate: (): boolean => false }
    );

    expect(ids(rules)).to.deep.equal([
      'ruleset:unit/action/move',
      'ruleset:unit/action/sneak-move',
      'ruleset:unit/action/overruled/sneak-move',
      'ruleset:unit/action/improvement/Ditch',
      'ruleset:unit/action/terrain/Fell',
    ]);
    expect(actionId('other', 'pillage')).to.equal('other:unit/action/pillage');
    rules.forEach((rule: Rule): void => {
      expect(rule).to.be.instanceOf(Action);
    });
  });

  it('keeps the order of the table', (): void => {
    const table: ActionRow[] = ['a', 'b', 'c', 'd'].map(
        (name: string): ActionRow => ({
          name,
          criteria: [],
          effect: () => marker(name),
        })
      ),
      deps = { ruleRegistry: new RuleRegistry() };

    expect(ids(actionRules('p', table, deps))).to.deep.equal([
      'p:unit/action/a',
      'p:unit/action/b',
      'p:unit/action/c',
      'p:unit/action/d',
    ]);
    expect(ids(actionRules('p', [...table].reverse(), deps))).to.deep.equal([
      'p:unit/action/d',
      'p:unit/action/c',
      'p:unit/action/b',
      'p:unit/action/a',
    ]);
  });

  it("asks a row's criteria as they are, in order, and nothing else", (): void => {
    const calls: string[] = [],
      [rule] = actionRules(
        'p',
        [
          {
            name: 'a',
            criteria: [
              recorder(calls, 'first'),
              recorder(calls, 'second'),
              recorder(calls, 'third'),
            ],
            effect: () => marker('a'),
          },
        ],
        { ruleRegistry: new RuleRegistry() }
      ),
      here = tile();

    expect(rule.validate(unit(player('one'), here), here, here)).to.equal(true);
    expect(calls).to.deep.equal(['first', 'second', 'third']);
  });

  it('passes the effect straight to the rule: its own `from` default, or none', (): void => {
    const seen: (Tile | undefined)[] = [],
      effect = new Effect((): UnitAction => marker('own effect')),
      [plain, given] = actionRules(
        'p',
        [
          {
            name: 'plain',
            criteria: [],
            effect: (unit: Unit, to: Tile, from: Tile): UnitAction => {
              seen.push(from);

              return marker('plain');
            },
          },
          { name: 'given', criteria: [], effect },
        ],
        { ruleRegistry: new RuleRegistry() }
      ),
      here = tile(),
      mover = unit(player('one'), here);

    (plain.process as (...args: unknown[]) => UnitAction)(mover, here);

    expect(seen).to.deep.equal([undefined]);
    expect(given.process(mover, here, here)).to.deep.equal(
      marker('own effect')
    );
  });

  describe('a row that breaks a treaty', (): void => {
    const setUp = (hasSenate?: (player: Player) => boolean) => {
      const calls: string[] = [],
        senate = new Set<Player>(),
        asked: Player[] = [],
        rules = actionRules(
          'p',
          [
            {
              name: 'sneak-attack',
              criteria: [recorder(calls, 'first'), recorder(calls, 'second')],
              effect: () => marker('sneak-attack'),
              breaksTreaty: {
                blocked: (unit: Unit, to: Tile, from: Tile): UnitAction => {
                  calls.push('blocked');

                  return marker(
                    `blocked from ${from === to ? 'here' : 'elsewhere'}`
                  );
                },
              },
            },
            {
              name: 'sneak-move',
              criteria: [],
              effect: () => marker('sneak-move'),
              breaksTreaty: {
                blocked: (): UnitAction => {
                  calls.push('blocked');

                  return marker('blocked move');
                },
                cost: (unit: Unit, to: Tile, from: Tile): number => {
                  calls.push('cost');

                  return from === to ? 2 : 3;
                },
              },
            },
          ],
          {
            ruleRegistry: new RuleRegistry(),
            hasSenate:
              hasSenate ??
              ((player: Player): boolean => {
                asked.push(player);
                calls.push('senate');

                return senate.has(player);
              }),
          }
        );

      return { asked, calls, rules, senate };
    };

    it('is offered without a Senate, and its overruled form, straight after it, with one', (): void => {
      const { asked, calls, rules, senate } = setUp(),
        here = tile(),
        free = player('free'),
        held = player('held');

      senate.add(held);

      expect(ids(rules)).to.deep.equal([
        'p:unit/action/sneak-attack',
        'p:unit/action/overruled/sneak-attack',
        'p:unit/action/sneak-move',
        'p:unit/action/overruled/sneak-move',
      ]);

      const [sneak, overruled] = rules;

      expect(sneak.validate(unit(free, here), here, here)).to.equal(true);
      // The gate is the last criterion, and asks once.
      expect(calls).to.deep.equal(['first', 'second', 'senate']);
      expect(asked).to.deep.equal([free]);
      expect(overruled.validate(unit(free, here), here, here)).to.equal(false);
      expect(sneak.validate(unit(held, here), here, here)).to.equal(false);
      expect(overruled.validate(unit(held, here), here, here)).to.equal(true);

      calls.length = 0;
      overruled.validate(unit(held, here), here, here);
      expect(calls).to.deep.equal(['first', 'second', 'senate']);
    });

    it("isn't asked about a Senate when the row's own criteria fail", (): void => {
      const asked: Player[] = [],
        [sneak, overruled] = actionRules(
          'p',
          [
            {
              name: 'sneak',
              criteria: [new Criterion((): boolean => false)],
              effect: () => marker('sneak'),
              breaksTreaty: { blocked: () => marker('blocked') },
            },
          ],
          {
            ruleRegistry: new RuleRegistry(),
            hasSenate: (player: Player): boolean => {
              asked.push(player);

              return false;
            },
          }
        ),
        here = tile();

      expect(sneak.validate(unit(player('one'), here), here, here)).to.equal(
        false
      );
      expect(
        overruled.validate(unit(player('one'), here), here, here)
      ).to.equal(false);
      expect(asked).to.deep.equal([]);
    });

    it('performs an `Overruled` wrapping the blocked action, at no cost unless the row gives one', (): void => {
      const { calls, rules } = setUp(),
        here = tile(),
        there = tile(),
        mover = unit(player('one'), here),
        attack = rules[1].process(mover, there, here) as unknown as Overruled;

      expect(attack).to.be.instanceOf(Overruled);
      expect(attack.action()).to.deep.equal(marker('blocked from elsewhere'));
      expect(attack.moves()).to.equal(0);
      expect(attack.from()).to.equal(here);
      expect(attack.to()).to.equal(there);
      expect(attack.unit()).to.equal(mover);

      calls.length = 0;

      const move = rules[3].process(mover, there, here) as unknown as Overruled;

      expect(move.action()).to.deep.equal(marker('blocked move'));
      expect(move.moves()).to.equal(3);
      // The blocked action is built before its cost is asked.
      expect(calls).to.deep.equal(['blocked', 'cost']);

      // `from` is the unit's tile when it isn't given.
      const defaulted = (rules[1].process as (...args: unknown[]) => Overruled)(
        mover,
        here
      );

      expect(defaulted.from()).to.equal(here);
      expect(defaulted.action()).to.deep.equal(marker('blocked from here'));
      expect(
        (rules[3].process as (...args: unknown[]) => Overruled)(
          mover,
          here
        ).moves()
      ).to.equal(2);
    });

    it('performs the row itself when not overruled', (): void => {
      const { rules } = setUp(),
        here = tile();

      expect(
        rules[0].process(unit(player('one'), here), here, here)
      ).to.deep.equal(marker('sneak-attack'));
    });

    it('is offered on its own criteria alone, with no overruled form, without `hasSenate`', (): void => {
      const calls: string[] = [],
        rules = actionRules(
          'p',
          [
            {
              name: 'sneak-move',
              criteria: [recorder(calls, 'first')],
              effect: () => marker('sneak-move'),
              breaksTreaty: { blocked: () => marker('blocked') },
            },
          ],
          { ruleRegistry: new RuleRegistry() }
        ),
        here = tile();

      expect(ids(rules)).to.deep.equal(['p:unit/action/sneak-move']);
      expect(rules[0].validate(unit(player('one'), here), here, here)).to.equal(
        true
      );
      expect(calls).to.deep.equal(['first']);
    });
  });

  describe('an improvement row', (): void => {
    const setUp = (allowed: boolean) => {
      const ruleRegistry = new RuleRegistry(),
        calls: string[] = [];

      ruleRegistry.register(
        new Available(
          new Criterion(
            (on: Tile, Improvement: typeof TileImprovement): boolean =>
              allowed && Improvement === Ditch
          )
        )
      );

      const [rule] = actionRules(
        'p',
        [
          {
            improvement: Ditch,
            extra: [recorder(calls, 'water'), recorder(calls, 'more')],
            effect: (
              unit: Unit,
              to: Tile,
              from: Tile = unit.tile()
            ): UnitAction => make<UnitAction>(DigDitch, { from: () => from }),
          },
        ],
        { ruleRegistry }
      );

      return { calls, rule };
    };

    it("asks the terrain job's criteria, then its own", (): void => {
      const { calls, rule } = setUp(true),
        here = tile();

      expect(
        rule.validate(unit(player('one'), here, [Terraforms]), here, here)
      ).to.equal(true);
      expect(calls).to.deep.equal(['water', 'more']);

      calls.length = 0;

      // Not a unit that `Terraforms`: the first of the terrain job's criteria.
      expect(rule.validate(unit(player('one'), here), here, here)).to.equal(
        false
      );
      expect(calls).to.deep.equal([]);
    });

    it('is only offered where `Available` allows the improvement', (): void => {
      const { calls, rule } = setUp(false),
        here = tile();

      expect(
        rule.validate(unit(player('one'), here, [Terraforms]), here, here)
      ).to.equal(false);
      expect(calls).to.deep.equal([]);
    });

    it('performs what the row builds', (): void => {
      const { rule } = setUp(true),
        here = tile();

      expect(
        rule.process(unit(player('one'), here, [Terraforms]), here, here)
      ).to.be.instanceOf(DigDitch);
    });
  });

  it("asks a conversion row's terrains, then its own criteria", (): void => {
    const calls: string[] = [],
      [rule] = actionRules(
        'p',
        [
          {
            conversion: Fell,
            terrains: [Wooded],
            extra: [recorder(calls, 'extra')],
            effect: () => marker('fell'),
          },
        ],
        { ruleRegistry: new RuleRegistry() }
      ),
      woods = tile(Wooded),
      field = tile(Open);

    expect(
      rule.validate(unit(player('one'), woods, [Terraforms]), woods, woods)
    ).to.equal(true);
    expect(calls).to.deep.equal(['extra']);
    expect(
      rule.validate(unit(player('one'), field, [Terraforms]), field, field)
    ).to.equal(false);
    expect(calls).to.deep.equal(['extra']);
  });
});

describe('placeActions', (): void => {
  const setUp = () => {
    const ruleRegistry = new RuleRegistry(),
      told: (string | null)[] = [],
      rules = actionRules(
        'set',
        ['first', 'second', 'third'].map(
          (name: string): ActionRow => ({
            name,
            criteria: [],
            effect: () => marker(name),
          })
        ),
        { ruleRegistry }
      ),
      note = new Note('set:note');

    ruleRegistry.register(rules[0], note, rules[1], rules[2]);
    ruleRegistry.onRegister((rule: Rule): void => {
      told.push(rule.id());
    });

    return { note, ruleRegistry, rules, told };
  };

  const plugin = (name: string, ...extra: (Criterion | High | Low)[]): Action =>
      new Action(
        `plugin:unit/action/${name}`,
        ...extra,
        new Effect((): UnitAction => marker(name))
      ),
    actionIds = (ruleRegistry: RuleRegistry): (string | null)[] =>
      ids(ruleRegistry.get(Action));

  it('places an action straight before its anchor', (): void => {
    const { ruleRegistry } = setUp(),
      here = tile();

    placeActions(
      ruleRegistry,
      { before: 'set:unit/action/second' },
      plugin('a'),
      plugin('b')
    );

    expect(actionIds(ruleRegistry)).to.deep.equal([
      'set:unit/action/first',
      'plugin:unit/action/a',
      'plugin:unit/action/b',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
    // In the order a unit is offered them.
    expect(
      ruleRegistry.process(Action, unit(player('one'), here), here, here)
    ).to.deep.equal(
      ['first', 'a', 'b', 'second', 'third'].map((name) => marker(name))
    );
  });

  it('places an action straight after its anchor, after any placed there earlier', (): void => {
    const { ruleRegistry } = setUp();

    placeActions(ruleRegistry, { after: 'set:unit/action/first' }, plugin('a'));
    placeActions(ruleRegistry, { after: 'set:unit/action/first' }, plugin('b'));
    placeActions(
      ruleRegistry,
      { before: 'set:unit/action/first' },
      plugin('c')
    );
    placeActions(
      ruleRegistry,
      { before: 'set:unit/action/first' },
      plugin('d')
    );

    expect(actionIds(ruleRegistry)).to.deep.equal([
      'plugin:unit/action/c',
      'plugin:unit/action/d',
      'set:unit/action/first',
      'plugin:unit/action/a',
      'plugin:unit/action/b',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
  });

  it('only adds the action after the last action, moving nothing', (): void => {
    const { ruleRegistry, told } = setUp();

    placeActions(ruleRegistry, { after: 'set:unit/action/third' }, plugin('a'));

    expect(actionIds(ruleRegistry)).to.deep.equal([
      'set:unit/action/first',
      'set:unit/action/second',
      'set:unit/action/third',
      'plugin:unit/action/a',
    ]);
    expect(told).to.deep.equal(['plugin:unit/action/a']);
  });

  it("keeps each moved rule's id and state, and the other rules where they were", (): void => {
    const { note, ruleRegistry, rules, told } = setUp(),
      count = ruleRegistry.length;

    rules[2].disable();

    placeActions(
      ruleRegistry,
      { before: 'set:unit/action/second' },
      plugin('a')
    );

    expect(ruleRegistry.length).to.equal(count + 1);
    expect(ruleRegistry.getById('set:unit/action/second')).to.equal(rules[1]);
    expect(ruleRegistry.getById('set:unit/action/third')).to.equal(rules[2]);
    expect(rules[2].enabled()).to.equal(false);
    expect(ruleRegistry.get(Note)).to.deep.equal([note]);
    // The moved rules are registered again, and their listeners told of them again.
    expect(told).to.deep.equal([
      'plugin:unit/action/a',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
    expect(
      ids(ruleRegistry.entries().filter((rule) => rule instanceof Action))
    ).to.deep.equal([
      'set:unit/action/first',
      'plugin:unit/action/a',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
  });

  it("refuses an anchor that isn't a registered action", (): void => {
    const { ruleRegistry } = setUp();

    expect(() =>
      placeActions(
        ruleRegistry,
        { after: 'set:unit/action/fourth' },
        plugin('a')
      )
    ).to.throw(UnknownAnchorError);
    expect(() =>
      placeActions(ruleRegistry, { before: 'set:note' }, plugin('a'))
    ).to.throw(UnknownAnchorError);
    expect(ruleRegistry.getById('plugin:unit/action/a')).to.equal(null);
  });

  it('refuses an action whose id is registered already, moving nothing', (): void => {
    const { ruleRegistry } = setUp();

    expect(() =>
      placeActions(
        ruleRegistry,
        { before: 'set:unit/action/second' },
        new Action(
          'set:unit/action/third',
          new Effect((): UnitAction => marker('again'))
        )
      )
    ).to.throw(DuplicateRuleIdError);
    expect(actionIds(ruleRegistry)).to.deep.equal([
      'set:unit/action/first',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
  });

  it('refuses two actions with the same id, moving nothing', (): void => {
    const { ruleRegistry, told } = setUp();

    expect(() =>
      placeActions(
        ruleRegistry,
        { after: 'set:unit/action/first' },
        plugin('a'),
        plugin('a')
      )
    ).to.throw(DuplicateRuleIdError);
    expect(actionIds(ruleRegistry)).to.deep.equal([
      'set:unit/action/first',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
    expect(told).to.deep.equal([]);
  });

  it('moves nothing, and tells no listener, when given no actions', (): void => {
    const { ruleRegistry, told } = setUp();

    placeActions(ruleRegistry, { before: 'set:unit/action/first' });

    expect(actionIds(ruleRegistry)).to.deep.equal([
      'set:unit/action/first',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
    expect(told).to.deep.equal([]);
    // The anchor is still checked.
    expect(() =>
      placeActions(ruleRegistry, { before: 'set:unit/action/fourth' })
    ).to.throw(UnknownAnchorError, /name order/);
  });

  it("refuses an action whose priority isn't its anchor's", (): void => {
    const { ruleRegistry } = setUp();

    expect(() =>
      placeActions(
        ruleRegistry,
        { before: 'set:unit/action/second' },
        plugin('a', new High())
      )
    ).to.throw(AnchorPriorityError);
    expect(ruleRegistry.getById('plugin:unit/action/a')).to.equal(null);
    expect(actionIds(ruleRegistry)).to.deep.equal([
      'set:unit/action/first',
      'set:unit/action/second',
      'set:unit/action/third',
    ]);
  });
});
