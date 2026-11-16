"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overruled = exports.treatyGate = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Actions_1 = require("@civ-clone/library-unit/Actions");
/**
 * The two criteria that split an action breaking a treaty by whether its player has a Senate (`hasSenate`, the
 * ruleset's own test). Each asks `hasSenate` itself. With `cityRegistry` and `unitRegistry`, the treaty partner on the
 * target square is found and passed; without them, it's `null` and nothing is looked up.
 */
const treatyGate = (hasSenate, { cityRegistry, unitRegistry, } = {}) => {
    const partner = (unit, to) => {
        if (cityRegistry === undefined || unitRegistry === undefined) {
            return null;
        }
        const city = cityRegistry.getByTile(to);
        if (city !== null) {
            return city.player();
        }
        const other = unitRegistry
            .getByTile(to)
            .find((tileUnit) => tileUnit.player() !== unit.player());
        return other === undefined ? null : other.player();
    }, senate = (unit, to, from) => hasSenate(unit.player(), partner(unit, to), unit, to, from);
    return {
        isFree: new Criterion_1.default((unit, to, from) => !senate(unit, to, from)),
        isOverruled: new Criterion_1.default((unit, to, from) => senate(unit, to, from)),
    };
};
exports.treatyGate = treatyGate;
/**
 * Builds the overruled form of a treaty-breaking action: offered on the action's own `criteria` when `isOverruled`
 * holds, it performs an `Overruled` wrapping the action that was `blocked`, at no cost in moves.
 */
const overruled = ({ id, isOverruled, ruleRegistry, }) => (name, blocked, ...criteria) => new Action_1.Action(id(name), ...criteria, isOverruled, new Effect_1.default((unit, to, from = unit.tile()) => new Actions_1.Overruled(from, to, unit, blocked(unit, to, from), 0, ruleRegistry)));
exports.overruled = overruled;
exports.default = exports.treatyGate;
//# sourceMappingURL=treatyGate.js.map