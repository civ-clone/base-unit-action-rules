"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tileHasCity = exports.isNavalUnit = exports.isLandUnit = void 0;
const Types_1 = require("@civ-clone/library-unit/Types");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const traits_1 = require("@civ-clone/core-unit/traits");
// Whether the unit is of the `Land` domain. Shared by every rule that uses it.
exports.isLandUnit = new Criterion_1.default((unit, to, from = unit.tile()) => (0, traits_1.isA)(unit, Types_1.Land));
// Whether the unit is of the `Naval` domain. Shared by every rule that uses it.
exports.isNavalUnit = new Criterion_1.default((unit, to, from = unit.tile()) => (0, traits_1.isA)(unit, Types_1.Naval));
const tileHasCity = (tile, cityRegistry) => cityRegistry.getByTile(tile) !== null;
exports.tileHasCity = tileHasCity;
//# sourceMappingURL=domain.js.map