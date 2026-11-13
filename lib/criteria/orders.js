"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orders = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const City_1 = require("@civ-clone/core-city/City");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const UnitImprovements_1 = require("@civ-clone/library-unit/UnitImprovements");
const Fortifies_1 = require("@civ-clone/base-unit-trait-fortifies/Fortifies");
const FoundsCities_1 = require("@civ-clone/base-unit-trait-founds-cities/FoundsCities");
const Types_1 = require("@civ-clone/library-unit/Types");
const Stowed_1 = require("@civ-clone/base-unit-action-embark/Busy/Stowed");
const Terraforms_1 = require("@civ-clone/base-unit-trait-terraforms/Terraforms");
const traits_1 = require("@civ-clone/core-unit/traits");
const joinableCity_1 = require("@civ-clone/base-unit-action-join-city/joinableCity");
const domain_1 = require("./domain");
/**
 * The criteria for the orders a unit is given on its own tile, each list in the order its rule checks them. Every list
 * starts with the shared `hasMovesLeft` and `isCurrentTile` criteria the order needs.
 */
const orders = ({ cityRegistry, ruleRegistry, unitImprovementRegistry, }) => ({
    fortifyCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => unit.hasTrait(Fortifies_1.default)),
        new Criterion_1.default((unit, to, from = unit.tile()) => from.isLand()),
    ],
    sleepCriteria: [Action_1.hasMovesLeft, Action_1.isCurrentTile],
    // Not cargo: a unit `Stowed` aboard a transport is woken by unloading, and an aircraft collected by a carrier stays
    //  active while stowed, so it would be offered this beside its own orders.
    activateCriteria: [
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => !(unit.busy() instanceof Stowed_1.default) &&
            (unit.busy() !== null ||
                unitImprovementRegistry
                    .getByUnit(unit)
                    .some((unitImprovement) => unitImprovement instanceof UnitImprovements_1.Fortified))),
    ],
    disbandCriteria: [Action_1.hasMovesLeft, Action_1.isCurrentTile],
    noOrdersCriteria: [Action_1.isCurrentTile],
    foundCityCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => unit.hasTrait(FoundsCities_1.default)),
        new Criterion_1.default((unit, to, from = unit.tile()) => from.isLand()),
        new Criterion_1.default((unit, to, from = unit.tile()) => !(0, domain_1.tileHasCity)(from, cityRegistry)),
    ],
    joinCityCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => unit.hasTrait(FoundsCities_1.default)),
        new Criterion_1.default((unit, to, from = unit.tile()) => (0, joinableCity_1.joinableCity)(unit, from, cityRegistry, ruleRegistry) !== null),
    ],
    setHomeCityCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit, to, from) => {
            const city = cityRegistry.getByTile(from);
            if (!(city instanceof City_1.default)) {
                return false;
            }
            return city.player() === unit.player();
        }),
    ],
    // Land units that fight (and others with `Fortifies`) and ships. Not workers, which have work to do, nor aircraft,
    //  which have fuel to mind.
    exploreCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => unit.hasTrait(Fortifies_1.default) || (0, traits_1.isA)(unit, Types_1.Naval)),
    ],
    automateCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => unit.hasTrait(Terraforms_1.default)),
    ],
});
exports.orders = orders;
exports.default = exports.orders;
//# sourceMappingURL=orders.js.map