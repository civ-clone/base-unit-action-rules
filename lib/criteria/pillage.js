"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pillageCriteria = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Fortifies_1 = require("@civ-clone/base-unit-trait-fortifies/Fortifies");
const NonCombatant_1 = require("@civ-clone/base-unit-trait-non-combatant/NonCombatant");
const Terraforms_1 = require("@civ-clone/base-unit-trait-terraforms/Terraforms");
/**
 * The criteria for pillaging the unit's own tile, in order: moves left, the current tile, a unit that `Fortifies` or
 * `Terraforms`, not a `NonCombatant`, and at least one `pillageable` improvement there.
 */
const pillageCriteria = ({ tileImprovementRegistry }, pillageable) => [
    Action_1.hasMovesLeft,
    Action_1.isCurrentTile,
    // Military units (`Fortifies`) and workers (`Terraforms`).
    new Criterion_1.default((unit) => unit.hasTrait(Fortifies_1.default) || unit.hasTrait(Terraforms_1.default)),
    new Criterion_1.default((unit) => !unit.hasTrait(NonCombatant_1.default)),
    new Criterion_1.default((unit, to) => tileImprovementRegistry.getByTile(to).filter(pillageable).length > 0),
];
exports.pillageCriteria = pillageCriteria;
exports.default = exports.pillageCriteria;
//# sourceMappingURL=pillage.js.map