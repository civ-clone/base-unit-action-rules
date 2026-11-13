"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nuclearCriteria = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Detonates_1 = require("@civ-clone/base-unit-trait-detonates/Detonates");
const nuclearCriteria = ({ cityRegistry, unitRegistry, }, atPeace) => {
    const nuclearTargets = (unit, to) => {
        const city = cityRegistry.getByTile(to);
        return Array.from(new Set([
            ...unitRegistry
                .getByTile(to)
                .map((tileUnit) => tileUnit.player()),
            ...(city === null ? [] : [city.player()]),
        ].filter((player) => player !== unit.player())));
    };
    return {
        nuclearTargets,
        nuclearAttackCriteria: [
            Action_1.isNeighbouringTile,
            Action_1.hasMovesLeft,
            new Criterion_1.default((unit) => unit.hasTrait(Detonates_1.default)),
            new Criterion_1.default((unit, to) => nuclearTargets(unit, to).length > 0),
        ],
        noNuclearTargetAtPeace: new Criterion_1.default((unit, to) => nuclearTargets(unit, to).every((player) => !atPeace(unit.player(), player))),
        anyNuclearTargetAtPeace: new Criterion_1.default((unit, to) => nuclearTargets(unit, to).some((player) => atPeace(unit.player(), player))),
    };
};
exports.nuclearCriteria = nuclearCriteria;
exports.default = exports.nuclearCriteria;
//# sourceMappingURL=nuclear.js.map