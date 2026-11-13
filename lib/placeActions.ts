import { Action } from '@civ-clone/core-unit/Rules/Action';
import Rule from '@civ-clone/core-rule/Rule';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';

// Where an action goes among a ruleset's actions: straight after, or straight before, the action rule with this id.
export type Anchor = { after: string } | { before: string };

/** Thrown when an anchor names no action rule that is registered: a typo, or the package declaring it isn't loaded. */
export class UnknownAnchorError extends Error {}

/** Thrown when an action's priority isn't its anchor's: rules are run by priority first, so the place couldn't hold. */
export class AnchorPriorityError extends Error {}

// The rules placed after each anchor, per registry, so that rules placed after the same one keep the order they were
//  placed in.
const placedAfter = new WeakMap<RuleRegistry, Map<string, Rule[]>>();

/**
 * Registers `rules`, a package's own action rules, at a place among the action rules already registered: straight
 * after the anchor (and after anything placed after it earlier), or straight before it. Without an anchor, a package's
 * actions come after those of every package that loaded before it, which is the order of their names.
 *
 * The place is settled here, once: the action rules after it are registered again behind `rules`, so `RuleRegistry`
 * runs them all in the order it always does, with nothing to work out when a unit is asked for its actions. Registering
 * them again tells `onRegister` listeners of them again.
 */
export const placeActions = (
  ruleRegistry: RuleRegistry,
  anchor: Anchor,
  ...rules: Action[]
): void => {
  const id = 'after' in anchor ? anchor.after : anchor.before,
    target = ruleRegistry.getById(id);

  if (!(target instanceof Action)) {
    throw new UnknownAnchorError(
      `No action rule is registered as '${id}'. Either it is misspelled, or the package that declares it is not loaded.`
    );
  }

  rules.forEach((rule: Action): void => {
    if (rule.priority().value() !== target.priority().value()) {
      throw new AnchorPriorityError(
        `'${rule.id()}' can't be placed by '${id}': their priorities differ.`
      );
    }
  });

  const actions = ruleRegistry.filter(
      (rule: Rule): boolean => rule instanceof Action
    ),
    byRegistry = placedAfter.get(ruleRegistry) ?? new Map<string, Rule[]>(),
    placed = byRegistry.get(id) ?? [];

  const at =
    'before' in anchor
      ? actions.indexOf(target)
      : Math.max(
          ...[target, ...placed].map((rule: Rule): number =>
            actions.indexOf(rule)
          )
        ) + 1;

  const after = actions.slice(at);

  if (after.length > 0) {
    ruleRegistry.unregister(...after);
  }

  ruleRegistry.register(...rules, ...after);

  if ('after' in anchor) {
    byRegistry.set(id, [...placed, ...rules]);
    placedAfter.set(ruleRegistry, byRegistry);
  }
};

export default placeActions;
