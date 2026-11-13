import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
/**
 * The criteria for an ordinary move onto `to`, in order: a neighbouring tile, moves left, the unit's domain allows it,
 * the ruleset's `zoneOfControl` criterion (see base-zone-of-control), no foreign city on `to`, and no foreign unit on
 * `to`. By domain:
 * - `Land`: from land to land, where every unit on `to` is the unit's player's own;
 * - `Naval`: from water or one of the player's own cities, to water or one of the player's own cities;
 * - `Air`: anywhere.
 */
export declare const domainMoveCriteria: (
  {
    cityRegistry,
    unitRegistry,
  }: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>,
  zoneOfControl: Criterion
) => Criterion[];
export default domainMoveCriteria;
