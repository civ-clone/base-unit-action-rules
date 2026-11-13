"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeActions = exports.AnchorPriorityError = exports.UnknownAnchorError = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
/** Thrown when an anchor names no action rule that is registered: a typo, or the package declaring it isn't loaded. */
class UnknownAnchorError extends Error {
}
exports.UnknownAnchorError = UnknownAnchorError;
/** Thrown when an action's priority isn't its anchor's: rules are run by priority first, so the place couldn't hold. */
class AnchorPriorityError extends Error {
}
exports.AnchorPriorityError = AnchorPriorityError;
// The rules placed after each anchor, per registry, so that rules placed after the same one keep the order they were
//  placed in.
const placedAfter = new WeakMap();
/**
 * Registers `rules`, a package's own action rules, at a place among the action rules already registered: straight
 * after the anchor (and after anything placed after it earlier), or straight before it. Without an anchor, a package's
 * actions come after those of every package that loaded before it, which is the order of their names.
 *
 * The place is settled here, once: the action rules after it are registered again behind `rules`, so `RuleRegistry`
 * runs them all in the order it always does, with nothing to work out when a unit is asked for its actions. Registering
 * them again tells `onRegister` listeners of them again.
 */
const placeActions = (ruleRegistry, anchor, ...rules) => {
    var _a, _b;
    const id = 'after' in anchor ? anchor.after : anchor.before, target = ruleRegistry.getById(id);
    if (!(target instanceof Action_1.Action)) {
        throw new UnknownAnchorError(`No action rule is registered as '${id}'. Either it is misspelled, or the package that declares it is not loaded.`);
    }
    rules.forEach((rule) => {
        // Checked here, before anything moves, rather than left to `register`, which would throw with the rules after the
        //  place already taken out.
        if (rule.id() !== null && ruleRegistry.getById(rule.id()) !== null) {
            throw new RuleRegistry_1.DuplicateRuleIdError(`'${rule.id()}' is registered already, so it can't be placed.`);
        }
        if (rule.priority().value() !== target.priority().value()) {
            throw new AnchorPriorityError(`'${rule.id()}' can't be placed by '${id}': their priorities differ.`);
        }
    });
    const actions = ruleRegistry.filter((rule) => rule instanceof Action_1.Action), byRegistry = (_a = placedAfter.get(ruleRegistry)) !== null && _a !== void 0 ? _a : new Map(), placed = (_b = byRegistry.get(id)) !== null && _b !== void 0 ? _b : [];
    const at = 'before' in anchor
        ? actions.indexOf(target)
        : Math.max(...[target, ...placed].map((rule) => actions.indexOf(rule))) + 1;
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
exports.placeActions = placeActions;
exports.default = exports.placeActions;
//# sourceMappingURL=placeActions.js.map