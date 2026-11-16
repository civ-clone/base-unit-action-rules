"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bribeUnitCriteria = exports.canIncite = exports.hasNoEmbassy = exports.canSteal = exports.diplomat = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const DiplomaticMissions_1 = require("@civ-clone/base-unit-trait-diplomatic-missions/DiplomaticMissions");
const embassy_1 = require("@civ-clone/base-diplomacy/lib/embassy");
/**
 * A diplomatic mission's actions on a rival's city: next to it, with moves left, and not from the sea. Units in the city
 * don't matter: the unit never enters it.
 */
const diplomat = ({ cityRegistry, }) => {
    const diplomatCity = (unit, to, from = unit.tile()) => {
        const city = cityRegistry.getByTile(to);
        return unit.hasTrait(DiplomaticMissions_1.default) &&
            from.isLand() &&
            city !== null &&
            city.player() !== unit.player()
            ? city
            : null;
    };
    return {
        diplomatCity,
        diplomatCriteria: [
            Action_1.isNeighbouringTile,
            Action_1.hasMovesLeft,
            new Criterion_1.default((unit, to, from = unit.tile()) => diplomatCity(unit, to, from) !== null),
        ],
    };
};
exports.diplomat = diplomat;
// Stealing from the city on `to`, as the ruleset's `canStealFrom` allows. List it after `diplomatCriteria`.
const canSteal = ({ cityRegistry }, canStealFrom) => new Criterion_1.default((unit, to) => canStealFrom(unit, cityRegistry.getByTile(to)));
exports.canSteal = canSteal;
// The unit's player has no embassy with the owner of the city on `to` yet (base-diplomacy's `hasEmbassy`: an
//  `Embassy`, or with `ruleRegistry` given, a `HasEmbassy` rule answering yes). List it after `diplomatCriteria`.
const hasNoEmbassy = ({ cityRegistry, interactionRegistry, ruleRegistry, }) => new Criterion_1.default((unit, to) => !(0, embassy_1.default)({ interactionRegistry, ruleRegistry }, unit.player(), cityRegistry.getByTile(to).player()));
exports.hasNoEmbassy = hasNoEmbassy;
// The city on `to` can be incited to revolt: it isn't a capital. List it after `diplomatCriteria`.
const canIncite = ({ cityRegistry }, isCapital) => new Criterion_1.default((unit, to) => !isCapital(cityRegistry.getByTile(to)));
exports.canIncite = canIncite;
/**
 * The criteria for bribing a unit, in order: a neighbouring tile, moves left, `DiplomaticMissions`, not from the sea, no
 * city on `to`, and exactly one unit there, a foreign one. No peace check: add one after these.
 */
const bribeUnitCriteria = ({ cityRegistry, unitRegistry, }) => [
    Action_1.isNeighbouringTile,
    Action_1.hasMovesLeft,
    new Criterion_1.default((unit) => unit.hasTrait(DiplomaticMissions_1.default)),
    new Criterion_1.default((unit, to, from = unit.tile()) => from.isLand()),
    new Criterion_1.default((unit, to) => cityRegistry.getByTile(to) === null),
    new Criterion_1.default((unit, to) => {
        const units = unitRegistry.getByTile(to);
        return units.length === 1 && units[0].player() !== unit.player();
    }),
];
exports.bribeUnitCriteria = bribeUnitCriteria;
exports.default = exports.diplomat;
//# sourceMappingURL=diplomat.js.map