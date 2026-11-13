"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionRules = exports.actionId = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Actions_1 = require("@civ-clone/library-unit/Actions");
const worker_1 = require("./criteria/worker");
const treatyGate_1 = require("./criteria/treatyGate");
// The id of the action rule `name` of a ruleset: `<prefix>:unit/action/<name>`.
const actionId = (prefix, name) => `${prefix}:unit/action/${name}`;
exports.actionId = actionId;
const effectOf = (effect) => effect instanceof Effect_1.default ? effect : new Effect_1.default(effect);
/**
 * A ruleset's action rules, built from its `table`, in the table's order: that order is the order the rules are
 * registered in, so the order in which a unit is offered its actions (the UI lists them in it; an AI may take the first).
 * A rule's criteria are the row's, as they are and in order, then the treaty gate for a treaty-breaking row. A row
 * left out of the table is a rule the ruleset doesn't have.
 */
const actionRules = (prefix, table, { ruleRegistry, hasSenate }) => {
    const gate = hasSenate === undefined ? null : (0, treatyGate_1.treatyGate)(hasSenate), rules = [];
    table.forEach((row) => {
        var _a, _b;
        if ('improvement' in row) {
            rules.push(new Action_1.Action((0, exports.actionId)(prefix, `improvement/${row.improvement.name}`), ...(0, worker_1.terrainJob)({ ruleRegistry }, row.improvement, ...((_a = row.extra) !== null && _a !== void 0 ? _a : [])), effectOf(row.effect)));
            return;
        }
        if ('conversion' in row) {
            rules.push(new Action_1.Action((0, exports.actionId)(prefix, `terrain/${row.conversion.name}`), ...(0, worker_1.terrainConversion)(row.terrains, ...((_b = row.extra) !== null && _b !== void 0 ? _b : [])), effectOf(row.effect)));
            return;
        }
        if (row.breaksTreaty === undefined || gate === null) {
            rules.push(new Action_1.Action((0, exports.actionId)(prefix, row.name), ...row.criteria, effectOf(row.effect)));
            return;
        }
        const { blocked, cost } = row.breaksTreaty;
        rules.push(new Action_1.Action((0, exports.actionId)(prefix, row.name), ...row.criteria, gate.isFree, effectOf(row.effect)), new Action_1.Action((0, exports.actionId)(prefix, `overruled/${row.name}`), ...row.criteria, gate.isOverruled, new Effect_1.default((unit, to, from = unit.tile()) => {
            const action = blocked(unit, to, from);
            return new Actions_1.Overruled(from, to, unit, action, cost === undefined ? 0 : cost(unit, to, from), ruleRegistry);
        })));
    });
    return rules;
};
exports.actionRules = actionRules;
exports.default = exports.actionRules;
//# sourceMappingURL=actionRules.js.map