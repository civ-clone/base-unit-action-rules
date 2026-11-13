import { Action } from '@civ-clone/core-unit/Rules/Action';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
export type Anchor =
  | {
      after: string;
    }
  | {
      before: string;
    };
/** Thrown when an anchor names no action rule that is registered: a typo, or the package declaring it isn't loaded. */
export declare class UnknownAnchorError extends Error {}
/** Thrown when an action's priority isn't its anchor's: rules are run by priority first, so the place couldn't hold. */
export declare class AnchorPriorityError extends Error {}
/**
 * Registers `rules`, a package's own action rules, at a place among the action rules already registered: straight
 * after the anchor (and after anything placed after it earlier), or straight before it. Without an anchor, a package's
 * actions come after those of every package that loaded before it, which is the order of their names.
 *
 * The place is settled here, once: the action rules after it are registered again behind `rules`, so `RuleRegistry`
 * runs them all in the order it always does, with nothing to work out when a unit is asked for its actions. Registering
 * them again tells `onRegister` listeners of them again.
 */
export declare const placeActions: (
  ruleRegistry: RuleRegistry,
  anchor: Anchor,
  ...rules: Action[]
) => void;
export default placeActions;
