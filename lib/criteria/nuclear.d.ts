import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
import { PeaceCheck } from './peace';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export interface NuclearCriteria {
  nuclearTargets: (unit: Unit, to: Tile) => Player[];
  nuclearAttackCriteria: Criterion[];
  noNuclearTargetAtPeace: Criterion;
  anyNuclearTargetAtPeace: Criterion;
}
export declare const nuclearCriteria: (
  {
    cityRegistry,
    unitRegistry,
  }: Pick<Dependencies, 'cityRegistry' | 'unitRegistry'>,
  atPeace: PeaceCheck
) => NuclearCriteria;
export default nuclearCriteria;
