"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeRoute = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const TradeMissions_1 = require("@civ-clone/base-unit-trait-trade-missions/TradeMissions");
/**
 * Where a unit with `TradeMissions` and a home city can set up a trade route: any foreign city, but not from the sea; or
 * one of its own player's cities other than its home, when `qualifies(home, city)`. `qualifies` is asked only then.
 */
const tradeRoute = ({ cityRegistry }, { qualifies }) => {
    const canEstablishTradeRoute = (unit, to, from = unit.tile()) => {
        const home = unit.city(), city = cityRegistry.getByTile(to);
        if (!unit.hasTrait(TradeMissions_1.default) || home === null || city === null) {
            return false;
        }
        if (city.player() !== unit.player()) {
            return from.isLand();
        }
        if (city === home) {
            return false;
        }
        return qualifies(home, city);
    };
    return {
        canEstablishTradeRoute,
        tradeRouteCriteria: [
            Action_1.isNeighbouringTile,
            Action_1.hasMovesLeft,
            new Criterion_1.default((unit, to, from = unit.tile()) => canEstablishTradeRoute(unit, to, from)),
        ],
    };
};
exports.tradeRoute = tradeRoute;
exports.default = exports.tradeRoute;
//# sourceMappingURL=tradeRoute.js.map