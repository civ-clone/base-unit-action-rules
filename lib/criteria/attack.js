"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureCityCriteria = exports.attackCriteria = exports.hasAttack = void 0;
const Types_1 = require("@civ-clone/library-unit/Types");
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const domain_1 = require("./domain");
const And_1 = require("@civ-clone/core-rule/Criteria/And");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Detonates_1 = require("@civ-clone/base-unit-trait-detonates/Detonates");
const Interceptor_1 = require("@civ-clone/base-unit-trait-interceptor/Interceptor");
const NonCombatant_1 = require("@civ-clone/base-unit-trait-non-combatant/NonCombatant");
const Or_1 = require("@civ-clone/core-rule/Criteria/Or");
const Submerged_1 = require("@civ-clone/base-unit-trait-submerged/Submerged");
const traits_1 = require("@civ-clone/core-unit/traits");
// A unit with no attack can't attack (civ-clone/web-renderer#642).
const hasAttack = (unit) => unit.attack().value() > 0;
exports.hasAttack = hasAttack;
/**
 * The criteria for attacking `to`, in order: a neighbouring tile, moves left, not a `NonCombatant`, not a unit that
 * `Detonates`, a foreign unit on `to`, `canAttack`, and then by domain:
 * - `Air`: unless every unit on `to` is `Air` too, only an `Interceptor`;
 * - `Land`: a city on `to`, or a `Land` unit there;
 * - `Naval`: a `Submerged` unit only at sea.
 */
const attackCriteria = ({ cityRegistry, unitRegistry, }, { canAttack = exports.hasAttack } = {}) => [
    Action_1.isNeighbouringTile,
    Action_1.hasMovesLeft,
    // A `NonCombatant` never attacks.
    new Criterion_1.default((unit) => !unit.hasTrait(NonCombatant_1.default)),
    // A unit that `Detonates` never fights: it detonates (`nuclearAttackCriteria`).
    new Criterion_1.default((unit) => !unit.hasTrait(Detonates_1.default)),
    new Criterion_1.default((unit, to) => unitRegistry
        .getByTile(to)
        .some((tileUnit) => tileUnit.player() !== unit.player())),
    // After the check for a foreign unit: working out a unit's attack runs its yield rules.
    new Criterion_1.default(canAttack),
    // Where the Unit is either...
    new Or_1.default(new And_1.default(
    // ...an Air Unit...
    new Criterion_1.default((unit) => (0, traits_1.isA)(unit, Types_1.Air)), 
    // ...and either...
    new Or_1.default(
    // ...not every Unit on the Tile is another Air Unit...
    new Criterion_1.default((unit, to) => !unitRegistry
        .getByTile(to)
        .every((tileUnit) => (0, traits_1.isA)(tileUnit, Types_1.Air))), 
    // ...or the Unit is an `Interceptor`.
    new Criterion_1.default((unit, to) => unit.hasTrait(Interceptor_1.default)))), new And_1.default(
    // ...or a Land Unit...
    domain_1.isLandUnit, 
    // ...and either...
    new Or_1.default(
    // ...the Tile has a City....
    new Criterion_1.default((unit, to) => (0, domain_1.tileHasCity)(to, cityRegistry)), 
    // ...or it's attacking another Land Unit.
    new Criterion_1.default((unit, to) => unitRegistry
        .getByTile(to)
        .some((tileUnit) => (0, traits_1.isA)(tileUnit, Types_1.Land))))), new And_1.default(
    // ...or a Naval Unit...
    domain_1.isNavalUnit, new Or_1.default(
    // ...that is either, not `Submerged` (they can only attack other `Naval` `Unit`s...
    new Criterion_1.default((unit, to) => !unit.hasTrait(Submerged_1.default)), 
    // ...or the `Tile` is `Water`.
    new Criterion_1.default((unit, to) => to.isWater())))),
];
exports.attackCriteria = attackCriteria;
/**
 * The criteria for taking an empty foreign city on `to`, in order: a neighbouring tile, moves left, a `Land` unit, not a
 * `NonCombatant`, a city on `to`, no units on `to`, and the city's owner isn't the unit's.
 */
const captureCityCriteria = ({ cityRegistry, unitRegistry, }) => [
    Action_1.isNeighbouringTile,
    Action_1.hasMovesLeft,
    domain_1.isLandUnit,
    // A `NonCombatant` never takes a city.
    new Criterion_1.default((unit) => !unit.hasTrait(NonCombatant_1.default)),
    new Criterion_1.default((unit, to) => (0, domain_1.tileHasCity)(to, cityRegistry)),
    new Criterion_1.default((unit, to) => unitRegistry.getByTile(to).length === 0),
    new Criterion_1.default((unit, to) => cityRegistry.getByTile(to).player() !== unit.player()),
];
exports.captureCityCriteria = captureCityCriteria;
exports.default = exports.attackCriteria;
//# sourceMappingURL=attack.js.map