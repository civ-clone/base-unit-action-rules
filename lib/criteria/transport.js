"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transport = void 0;
const Types_1 = require("@civ-clone/library-unit/Types");
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Or_1 = require("@civ-clone/core-rule/Criteria/Or");
const Types_2 = require("@civ-clone/core-terrain/Types");
const traits_1 = require("@civ-clone/core-unit/traits");
const domain_1 = require("./domain");
// The criteria for boarding and leaving a transport, each list in the order its rule checks them.
const transport = ({ transportRegistry, unitRegistry, }) => ({
    embarkCriteria: [
        Action_1.isNeighbouringTile,
        Action_1.hasMovesLeft,
        domain_1.isLandUnit,
        new Criterion_1.default((unit, to) => to.terrain() instanceof Types_2.Water),
        new Criterion_1.default((unit, to) => unitRegistry
            .getByTile(to)
            .every((tileUnit) => tileUnit.player() === unit.player())),
        new Criterion_1.default((unit, to) => unitRegistry
            .getByTile(to)
            .filter((tileUnit) => tileUnit instanceof Types_1.NavalTransport)
            .some((tileUnit) => tileUnit.hasCapacity() &&
            tileUnit.canStow(unit))),
    ],
    disembarkCriteria: [
        Action_1.isNeighbouringTile,
        // `hasUnit`, not `getByUnit` in a `try`: the answer is nearly always "no", and `getByUnit` gives it by throwing. It
        //  is asked of every tile beside every unit an AI considers moving, so it comes first.
        new Criterion_1.default((unit) => transportRegistry.hasUnit(unit)),
        // An aircraft takes off with a plain move instead: leaving a transport this way ends the unit's turn.
        new Criterion_1.default((unit) => !(0, traits_1.isA)(unit, Types_1.Air)),
        new Or_1.default(new Criterion_1.default((unit, to) => !(0, traits_1.isA)(unit, Types_1.Land)), new Criterion_1.default((unit, to) => to.isLand())),
        new Criterion_1.default((unit, to, from = unit.tile()) => transportRegistry.getByUnit(unit).transport().tile() === from),
    ],
    unloadCriteria: [
        Action_1.hasMovesLeft,
        Action_1.isCurrentTile,
        new Criterion_1.default((unit) => unit instanceof Types_1.NavalTransport),
        new Criterion_1.default((unit) => unit.hasCargo()),
        new Criterion_1.default((unit, to) => to.getNeighbours().some((tile) => tile.isLand())),
    ],
});
exports.transport = transport;
exports.default = exports.transport;
//# sourceMappingURL=transport.js.map