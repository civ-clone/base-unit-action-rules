"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.peaceCriteria = exports.peaceExpired = exports.atPeace = void 0;
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Declarations_1 = require("@civ-clone/library-diplomacy/Declarations");
/**
 * Whether `player` and `other` have a `Peace` that is `active()`. What a sneak action (one that breaks the peace) asks.
 */
const atPeace = (interactionRegistry) => (player, other) => interactionRegistry
    .getByPlayers(player, other)
    .some((interaction) => interaction instanceof Declarations_1.Peace && interaction.active());
exports.atPeace = atPeace;
/**
 * Whether every `Peace` between `player` and `other` has `expired()`, which holds when they have none. What an ordinary
 * attack or capture asks. Not the negation of `atPeace`: a `Peace` can be neither active nor expired.
 */
const peaceExpired = (interactionRegistry) => (player, other) => interactionRegistry
    .getByPlayers(player, other)
    .filter((interaction) => interaction instanceof Declarations_1.Peace)
    .every((interaction) => interaction.expired());
exports.peaceExpired = peaceExpired;
// The peace checks a set of action rules shares, built once.
const peaceCriteria = ({ cityRegistry, interactionRegistry, unitRegistry, }) => {
    const active = (0, exports.atPeace)(interactionRegistry), expired = (0, exports.peaceExpired)(interactionRegistry), owner = (to) => cityRegistry.getByTile(to).player();
    return {
        atPeace: active,
        peaceExpired: expired,
        allPeaceExpired: new Criterion_1.default((unit, to) => unitRegistry
            .getByTile(to)
            .every((tileUnit) => expired(unit.player(), tileUnit.player()))),
        allAtPeace: new Criterion_1.default((unit, to) => unitRegistry
            .getByTile(to)
            .every((tileUnit) => active(unit.player(), tileUnit.player()))),
        ownerPeaceExpired: new Criterion_1.default((unit, to) => expired(unit.player(), owner(to))),
        peaceWithOwner: new Criterion_1.default((unit, to) => active(unit.player(), owner(to))),
    };
};
exports.peaceCriteria = peaceCriteria;
exports.default = exports.peaceCriteria;
//# sourceMappingURL=peace.js.map