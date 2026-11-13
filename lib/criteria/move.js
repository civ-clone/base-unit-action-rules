"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainMoveCriteria = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const domain_1 = require("./domain");
const Types_1 = require("@civ-clone/library-unit/Types");
const And_1 = require("@civ-clone/core-rule/Criteria/And");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Or_1 = require("@civ-clone/core-rule/Criteria/Or");
const traits_1 = require("@civ-clone/core-unit/traits");
/**
 * The criteria for an ordinary move onto `to`, in order: a neighbouring tile, moves left, the unit's domain allows it,
 * the ruleset's `zoneOfControl` criterion (see base-zone-of-control), no foreign city on `to`, and no foreign unit on
 * `to`. By domain:
 * - `Land`: from land to land, where every unit on `to` is the unit's player's own;
 * - `Naval`: from water or one of the player's own cities, to water or one of the player's own cities;
 * - `Air`: anywhere.
 */
const domainMoveCriteria = ({ cityRegistry, unitRegistry, }, zoneOfControl) => [
    Action_1.isNeighbouringTile,
    Action_1.hasMovesLeft,
    new Or_1.default(
    // `Land` units can move to other `Land` `Tile`s.
    new And_1.default(domain_1.isLandUnit, new Criterion_1.default((unit, to, from = unit.tile()) => from.isLand()), new Criterion_1.default((unit, to) => to.isLand()), 
    // Either there are no units, or they're the same `Player`.
    new Criterion_1.default((unit, to) => unitRegistry
        .getByTile(to)
        .every((tileUnit) => tileUnit.player() === unit.player()))), new And_1.default(domain_1.isNavalUnit, 
    // `Naval` `Unit`s can either move from `Water` or a friendly `City`...
    new Or_1.default(new Criterion_1.default((unit, to, from = unit.tile()) => from.isWater()), new Criterion_1.default((unit, to, from = unit.tile()) => { var _a; return ((_a = cityRegistry.getByTile(from)) === null || _a === void 0 ? void 0 : _a.player()) === unit.player(); })), 
    // ...to `Water` or a friendly `City`.
    new Or_1.default(new Criterion_1.default((unit, to) => to.isWater()), new Criterion_1.default((unit, to) => { var _a; return ((_a = cityRegistry.getByTile(to)) === null || _a === void 0 ? void 0 : _a.player()) === unit.player(); }))), 
    // `Air` `Unit`s can move anywhere. Where they could land, a ruleset can offer landing first, and this lets them fly
    // over instead.
    new Criterion_1.default((unit) => (0, traits_1.isA)(unit, Types_1.Air))),
    zoneOfControl,
    new Criterion_1.default((unit, to) => {
        const city = cityRegistry.getByTile(to);
        if (city === null) {
            return true;
        }
        return city.player() === unit.player();
    }),
    new Criterion_1.default((unit, to) => !unitRegistry
        .getByTile(to)
        .some((tileUnit) => tileUnit.player() !== unit.player())),
];
exports.domainMoveCriteria = domainMoveCriteria;
exports.default = exports.domainMoveCriteria;
//# sourceMappingURL=move.js.map