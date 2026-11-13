"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.landing = void 0;
const Types_1 = require("@civ-clone/library-unit/Types");
const traits_1 = require("@civ-clone/core-unit/traits");
// Where an aircraft moving onto `to` would land.
const landing = ({ cityRegistry, unitRegistry, }) => {
    const landsInCity = (unit, to) => { var _a; return ((_a = cityRegistry.getByTile(to)) === null || _a === void 0 ? void 0 : _a.player()) === unit.player(); }, landingTransport = (unit, to) => {
        var _a;
        const [transport] = unitRegistry
            .getByTile(to)
            .filter((tileUnit) => tileUnit instanceof Types_1.NavalTransport &&
            tileUnit.player() === unit.player() &&
            tileUnit.hasCapacity() &&
            tileUnit.canStow(unit));
        return (_a = transport) !== null && _a !== void 0 ? _a : null;
    }, canLandAircraft = (unit, to) => (0, traits_1.isA)(unit, Types_1.Air) &&
        (landsInCity(unit, to) || landingTransport(unit, to) !== null);
    return {
        landsInCity,
        landingTransport,
        canLandAircraft,
    };
};
exports.landing = landing;
exports.default = exports.landing;
//# sourceMappingURL=landing.js.map