"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partnerCriteria = void 0;
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const partnerCriteria = ({ unitRegistry }, partnerOf) => {
    const movePartner = (unit, to, from = unit.tile()) => {
        if (!from.isLand() || !to.isLand()) {
            return null;
        }
        const partner = partnerOf(unit, to);
        return partner !== null &&
            !unitRegistry
                .getByTile(to)
                .some((tileUnit) => tileUnit.player() === unit.player())
            ? partner
            : null;
    };
    return {
        movePartner,
        onPartnersLand: new Criterion_1.default((unit, to, from = unit.tile()) => movePartner(unit, to, from) !== null),
        offPartnersLand: new Criterion_1.default((unit, to, from = unit.tile()) => movePartner(unit, to, from) === null),
        pillagingPartnersLand: new Criterion_1.default((unit, to) => partnerOf(unit, to) !== null),
        notPillagingPartnersLand: new Criterion_1.default((unit, to) => partnerOf(unit, to) === null),
    };
};
exports.partnerCriteria = partnerCriteria;
exports.default = exports.partnerCriteria;
//# sourceMappingURL=partners.js.map