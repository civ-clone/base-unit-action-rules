"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutePlanner = exports.routingEvents = void 0;
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Path_1 = require("@civ-clone/core-world-path/Path");
const PlannedPathFinderRegistry_1 = require("./PlannedPathFinderRegistry");
/**
 * The events that change where units (and cities) are, which is what a route
 * depends on besides the tiles themselves.
 */
exports.routingEvents = [
    'city:captured',
    'city:created',
    'city:destroyed',
    'unit:created',
    'unit:destroyed',
    'unit:moved',
    'unit:transferred',
];
/**
 * The routes found to offer the distant actions, kept for the actions that are
 * then performed (civ-clone/web-renderer#307).
 *
 * The `goTo()` criterion has to find a route to say whether a go-to is on
 * offer, and the action it builds would otherwise look for the same route
 * again; `goToEffect()` hands the action that route instead. `route()` and
 * `routeEffect()` do the same for actions that build along the way (a road to,
 * say), and reuse the route the `goTo()` criterion found for the same journey
 * a moment before, when it did, so offering them costs no search of their own.
 *
 * This relies on every action's criteria being validated before any effect
 * runs, so a ruleset lists its go-to action before the route actions that
 * reuse its route.
 *
 * A route is only followed while nothing in `routingEvents` has happened since
 * it was found, so one kept for an action performed later (not in the same
 * `handleAction`) is searched for again instead.
 *
 * Make one per set of rules: each listens to `routingEvents` on `engine`.
 */
class RoutePlanner {
    constructor({ engine, pathFinderRegistry, ruleRegistry, strategyNoteRegistry, }) {
        this._plannedGoTo = null;
        this._plannedRoute = null;
        this._revision = 0;
        this._pathFinderRegistry = pathFinderRegistry;
        this._ruleRegistry = ruleRegistry;
        this._strategyNoteRegistry = strategyNoteRegistry;
        exports.routingEvents.forEach((event) => {
            engine.on(event, () => {
                this._revision++;
                this._plannedGoTo = null;
            });
        });
    }
    /** Counts the `routingEvents` seen so far. */
    revision() {
        return this._revision;
    }
    /** Whether `unit` can find a route from `from` to `to`, keeping it for `goToEffect()`. */
    goTo() {
        return new Criterion_1.default((unit, to, from) => {
            const [PathFinder] = this._pathFinderRegistry.entries();
            this._plannedGoTo = null;
            if (!PathFinder) {
                return false;
            }
            const path = new PathFinder(unit, from, to).generate();
            if (!(path instanceof Path_1.default)) {
                return false;
            }
            this._plannedGoTo = {
                unit,
                from,
                to,
                path,
                revision: this._revision,
            };
            return true;
        });
    }
    /** A `GoToAction` that follows the route `goTo()` found, if it is still the one for this journey. */
    goToEffect(GoToAction) {
        return new Effect_1.default((unit, to, from) => {
            const planned = this._plannedGoTo, isPlanned = planned !== null &&
                planned.unit === unit &&
                planned.from === from &&
                planned.to === to &&
                planned.revision === this._revision;
            this._plannedGoTo = null;
            return new GoToAction(from, to, unit, this._ruleRegistry, isPlanned
                ? this.plannedPathFinderRegistry(planned)
                : this._pathFinderRegistry, this._strategyNoteRegistry);
        });
    }
    /**
     * Whether `unit` can find a route from `from` to `to`, reusing the one `goTo()` just found for the same journey,
     *  keeping it for `routeEffect()`. The route actions share one kept route.
     */
    route() {
        return new Criterion_1.default((unit, to, from) => {
            const found = this._plannedGoTo;
            this._plannedRoute = null;
            if (found !== null &&
                found.unit === unit &&
                found.from === from &&
                found.to === to &&
                found.revision === this._revision) {
                this._plannedRoute = found;
                return true;
            }
            const [PathFinder] = this._pathFinderRegistry.entries();
            if (!PathFinder) {
                return false;
            }
            const path = new PathFinder(unit, from, to).generate();
            if (!(path instanceof Path_1.default)) {
                return false;
            }
            this._plannedRoute = {
                unit,
                from,
                to,
                path,
                revision: this._revision,
            };
            return true;
        });
    }
    /** A `RouteAction` that follows the route `route()` found, if it is still the one for this journey. */
    routeEffect(RouteAction) {
        return new Effect_1.default((unit, to, from) => {
            const planned = this._plannedRoute, isPlanned = planned !== null &&
                planned.unit === unit &&
                planned.from === from &&
                planned.to === to &&
                planned.revision === this._revision;
            return new RouteAction(from, to, unit, this._ruleRegistry, isPlanned
                ? this.plannedPathFinderRegistry(planned)
                : this._pathFinderRegistry, this._strategyNoteRegistry);
        });
    }
    plannedPathFinderRegistry(planned) {
        return new PlannedPathFinderRegistry_1.default(planned.unit, planned.from, planned.to, planned.path, this._pathFinderRegistry, () => this._revision, planned.revision);
    }
}
exports.RoutePlanner = RoutePlanner;
exports.default = RoutePlanner;
//# sourceMappingURL=RoutePlanner.js.map