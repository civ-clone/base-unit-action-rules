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

- `lib/criteria/*`: criteria for a ruleset's movement and combat actions, each factory called once per set of rules
  with the registries it needs. Each returns the same leaf criteria, in the same order, as the rules they were lifted
  from (civ1-unit), so an action's criteria are checked exactly as before. Predicates the ruleset passes in become their
  own criteria as they are, with no defaults added.
  - `domain`: `isLandUnit`, `isNavalUnit` (shared criteria) and `tileHasCity(tile, cityRegistry)`.
  - `peace`: `atPeace` (a `Peace` is `active()`) and `peaceExpired` (every `Peace` has `expired()`), kept apart, and
    `peaceCriteria(deps)` with `allPeaceExpired`, `allAtPeace`, `ownerPeaceExpired` and `peaceWithOwner`.
  - `attack`: `attackCriteria(deps, { canAttack })`, where `canAttack` (asked after the check for a foreign unit) is
    `hasAttack`, an attack above 0, by default; and `captureCityCriteria(deps)`.
  - `nuclear`: `nuclearCriteria(deps, atPeace)`: `nuclearTargets`, `nuclearAttackCriteria`, `noNuclearTargetAtPeace`
    and `anyNuclearTargetAtPeace`.
  - `landing`: `landing(deps)`: `landsInCity`, `landingTransport` and `canLandAircraft`.
  - `move`: `domainMoveCriteria(deps, zoneOfControl)`, with the ruleset's zone of control criterion
    (base-zone-of-control) after the domain checks.
  - `partners`: `partnerCriteria(deps, partnerOf)`, over the ruleset's territory model: `movePartner`,
    `onPartnersLand`/`offPartnersLand` and `pillagingPartnersLand`/`notPillagingPartnersLand`.
  - `pillage`: `pillageCriteria(deps, pillageable)`, with the ruleset's list of what can be pillaged.
  - `treatyGate`: `treatyGate(hasSenate)` gives `isFree` and `isOverruled`; `overruled({ id, isOverruled, ruleRegistry })`
    builds the overruled form of a treaty-breaking action, with its id from the ruleset's `id(name)`.

A library: it has no `main` and registers no rules. See `civ1-unit` for Civilization's unit actions.
