import Criterion from '@civ-clone/core-rule/Criterion';
import Dependencies from '../Dependencies';
export interface TransportCriteria {
  embarkCriteria: Criterion[];
  disembarkCriteria: Criterion[];
  unloadCriteria: Criterion[];
}
export declare const transport: ({
  transportRegistry,
  unitRegistry,
}: Pick<
  Dependencies,
  'transportRegistry' | 'unitRegistry'
>) => TransportCriteria;
export default transport;
