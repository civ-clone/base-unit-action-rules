import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export interface TradeRouteOptions {
  qualifies: (home: City, city: City) => boolean;
}
export interface TradeRoute {
  canEstablishTradeRoute: (unit: Unit, to: Tile, from?: Tile) => boolean;
  tradeRouteCriteria: Criterion[];
}
/**
 * Where a unit with `TradeMissions` and a home city can set up a trade route: any foreign city, but not from the sea; or
 * one of its own player's cities other than its home, when `qualifies(home, city)`. `qualifies` is asked only then.
 */
export declare const tradeRoute: (
  { cityRegistry }: Pick<Dependencies, 'cityRegistry'>,
  { qualifies }: TradeRouteOptions
) => TradeRoute;
export default tradeRoute;
