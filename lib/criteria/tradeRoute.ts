import {
  hasMovesLeft,
  isNeighbouringTile,
} from '@civ-clone/core-unit/Rules/Action';
import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Tile from '@civ-clone/core-world/Tile';
import TradeMissions from '@civ-clone/base-unit-trait-trade-missions/TradeMissions';
import Unit from '@civ-clone/core-unit/Unit';

export interface TradeRouteOptions {
  // Whether a route from `home` to `city`, another of the same player's cities, is worth setting up: the ruleset's own
  //  test (distance, continent, what the city is building).
  qualifies: (home: City, city: City) => boolean;
}

export interface TradeRoute {
  // Whether `unit` can set up a trade route with the city on `to`.
  canEstablishTradeRoute: (unit: Unit, to: Tile, from?: Tile) => boolean;
  // The criteria for setting one up, in order: a neighbouring tile, moves left, and `canEstablishTradeRoute`.
  tradeRouteCriteria: Criterion[];
}

/**
 * Where a unit with `TradeMissions` and a home city can set up a trade route: any foreign city, but not from the sea; or
 * one of its own player's cities other than its home, when `qualifies(home, city)`. `qualifies` is asked only then.
 */
export const tradeRoute = (
  { cityRegistry }: Pick<Dependencies, 'cityRegistry'>,
  { qualifies }: TradeRouteOptions
): TradeRoute => {
  const canEstablishTradeRoute = (
    unit: Unit,
    to: Tile,
    from: Tile = unit.tile()
  ): boolean => {
    const home = unit.city(),
      city = cityRegistry.getByTile(to);

    if (!unit.hasTrait(TradeMissions) || home === null || city === null) {
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
      isNeighbouringTile,
      hasMovesLeft,
      new Criterion((unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        canEstablishTradeRoute(unit, to, from)
      ),
    ],
  };
};

export default tradeRoute;
