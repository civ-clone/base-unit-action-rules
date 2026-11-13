import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
export interface OrderCriteria {
  fortifyCriteria: Criterion[];
  sleepCriteria: Criterion[];
  activateCriteria: Criterion[];
  disbandCriteria: Criterion[];
  noOrdersCriteria: Criterion[];
  foundCityCriteria: Criterion[];
  joinCityCriteria: Criterion[];
  setHomeCityCriteria: Criterion[];
  exploreCriteria: Criterion[];
  automateCriteria: Criterion[];
}
/**
 * The criteria for the orders a unit is given on its own tile, each list in the order its rule checks them. Every list
 * starts with the shared `hasMovesLeft` and `isCurrentTile` criteria the order needs.
 */
export declare const orders: ({
  cityRegistry,
  ruleRegistry,
  unitImprovementRegistry,
}: Pick<
  Dependencies,
  'cityRegistry' | 'ruleRegistry' | 'unitImprovementRegistry'
>) => OrderCriteria;
export default orders;
