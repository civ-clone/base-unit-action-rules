"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanPollution = exports.terrainConversion = exports.requiresImprovement = exports.terrainJob = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Available_1 = require("@civ-clone/core-tile-improvement/Rules/Available");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Terraforms_1 = require("@civ-clone/base-unit-trait-terraforms/Terraforms");
/**
 * The criteria for building `Improvement` on the unit's own tile, in order: a unit that `Terraforms`, moves left, an
 * `Available` rule allowing `Improvement` there for the unit's player, the current tile, then the ruleset's `extra`
 * criteria (what else the improvement needs, such as water nearby), as they are.
 */
const terrainJob = ({ ruleRegistry }, Improvement, ...extra) => [
    new Criterion_1.default((unit) => unit.hasTrait(Terraforms_1.default)),
    Action_1.hasMovesLeft,
    new Criterion_1.default((unit, to, from = unit.tile()) => ruleRegistry
        .get(Available_1.default)
        .some((rule) => rule.validate(from, Improvement, unit.player()))),
    Action_1.isCurrentTile,
    ...extra,
];
exports.terrainJob = terrainJob;
// `to` already has an `Improvement` (one improvement built on another). For a `terrainJob`'s `extra`.
const requiresImprovement = ({ tileImprovementRegistry }, Improvement) => new Criterion_1.default((unit, to) => tileImprovementRegistry
    .getByTile(to)
    .some((tileImprovement) => tileImprovement instanceof Improvement));
exports.requiresImprovement = requiresImprovement;
/**
 * The criteria for changing the unit's own tile's terrain, in order: moves left, the current tile, a unit that
 * `Terraforms`, the tile's terrain being one of `TerrainTypes` (the ruleset's conversion table), then the ruleset's
 * `extra` criteria, as they are.
 */
const terrainConversion = (TerrainTypes, ...extra) => [
    Action_1.hasMovesLeft,
    Action_1.isCurrentTile,
    new Criterion_1.default((unit) => unit.hasTrait(Terraforms_1.default)),
    new Criterion_1.default((unit, to, from = unit.tile()) => TerrainTypes.some((TerrainType) => from.terrain() instanceof TerrainType)),
    ...extra,
];
exports.terrainConversion = terrainConversion;
/**
 * The criteria for cleaning up the unit's own tile, in order: moves left, the current tile, a unit that `Terraforms`,
 * and a `Pollution` improvement (the ruleset's class) on the tile.
 */
const cleanPollution = ({ tileImprovementRegistry }, Pollution) => [
    Action_1.hasMovesLeft,
    Action_1.isCurrentTile,
    new Criterion_1.default((unit) => unit.hasTrait(Terraforms_1.default)),
    new Criterion_1.default((unit, to, from = unit.tile()) => tileImprovementRegistry
        .getByTile(from)
        .some((improvement) => improvement instanceof Pollution)),
];
exports.cleanPollution = cleanPollution;
//# sourceMappingURL=worker.js.map