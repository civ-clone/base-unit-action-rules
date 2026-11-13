# base-unit-action-rules

Building blocks for a ruleset's unit action rules. The ruleset keeps its own `Action` rules, with its own ids, order and
numbers, and builds their criteria and effects from these:

- `lib/RoutePlanner`: `new RoutePlanner({ engine, pathFinderRegistry, ruleRegistry, strategyNoteRegistry })`, one per
  set of rules. `goTo()` is a criterion that finds a route and keeps it, and `goToEffect(GoTo)` builds a `GoTo` that
  follows that route rather than searching for it again. `route()` and `routeEffect(RoadTo)` do the same for actions
  that build along a route, reusing the route `goTo()` found for the same journey. List the go-to action before the
  route actions. A kept route is dropped once anything in `routingEvents` happens (units or cities created, moved,
  destroyed or captured).
- `lib/PlannedPathFinderRegistry`: the path finders of a `PathFinderRegistry`, except that the first search for the
  planned journey returns the planned route.
- `lib/Dependencies`: the registries the builders take, by name.
- `lib/moveShortfall`: `succeedsShort(remaining, cost, factor, rng)` is whether a unit short of the moves a step costs
  still makes it (`remaining >= cost × factor × rng()`, one draw), and `expectedCost(movement, cost, factor)` is what such
  a step is worth on average to a path finder (`max(movement, cost × factor)`).

A library: it has no `main` and registers no rules. See `civ1-unit` for Civilization's unit actions.
