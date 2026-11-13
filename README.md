# base-unit-action-rules

Building blocks for a ruleset's unit action rules. The ruleset keeps its own `Action` rules, with its own ids, order and
numbers, and builds their criteria and effects from these:

- `lib/actionRules`: `actionRules(prefix, table, { ruleRegistry, hasSenate })` builds a ruleset's action rules from a
  table, in the table's order, which is the order a unit is offered its actions in. Each row is one of:
  - `{ name, criteria, effect }`: the rule `<prefix>:unit/action/<name>`, with the row's criteria as they are, in order,
    and its effect (a function building the unit action, given to the rule as it is, or an `Effect`).
  - the same with `breaksTreaty: { blocked, cost? }`, for an action that breaks a treaty. With `hasSenate`, it is
    offered only to a player without a Senate (a criterion after the row's own), and straight after it comes
    `<prefix>:unit/action/overruled/<name>`, on the same criteria, for a player with one: it performs an `Overruled`
    wrapping `blocked`, costing `cost` moves (0 if not given). Without `hasSenate`, there is no such rule and no gate.
  - `{ improvement, extra?, effect }`: `<prefix>:unit/action/improvement/<improvement's class name>`, on `terrainJob`'s
    criteria and then `extra`.
  - `{ conversion, terrains, extra?, effect }`: `<prefix>:unit/action/terrain/<conversion's class name>`, on
    `terrainConversion(terrains, ...extra)`.
  A row left out is an action the ruleset doesn't have; rows in another order are offered in that order.
- `lib/placeActions`: `placeActions(ruleRegistry, { after: id } | { before: id }, ...rules)` registers a package's own
  action rules at a place among those already registered: straight before the anchor, or straight after it (and after
  anything placed after it earlier). The place is settled once, when it is called, by registering the actions after it
  again behind the new ones, so nothing is worked out when a unit is asked for its actions. The anchor must be a
  registered `Action` (otherwise `UnknownAnchorError`), with the same priority (otherwise `AnchorPriorityError`): rules
  run by priority first. Without it, a package's actions come after those of the packages loaded before it.

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

- `lib/criteria/*`: criteria for a ruleset's movement, combat, diplomatic, trade, terrain, transport and order actions,
  each factory called once per set of rules with the registries it needs. Each returns the same leaf criteria, in the
  same order, as the rules they were lifted from (civ1-unit), so an action's criteria are checked exactly as before.
  Predicates and criteria the ruleset passes in become their own criteria as they are, with no defaults added, except
  the diplomatic and trade ones (`canStealFrom`, `isCapital`, `qualifies`), which are asked inside the one criterion
  they replace a part of.
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
  - `diplomat`: `diplomat(deps)` gives `diplomatCity` (the foreign city on `to` a unit with `DiplomaticMissions` could
    act on, not from the sea) and `diplomatCriteria`, which every action on that city shares. To list after them:
    `canSteal(deps, canStealFrom)`, `hasNoEmbassy(deps)` (no `Embassy` held with the city's owner yet) and
    `canIncite(deps, isCapital)`. `bribeUnitCriteria(deps)`: a lone foreign unit outside a city. None has a peace check,
    so a ruleset adds its own (`peaceCriteria`, `treatyGate`).
  - `tradeRoute`: `tradeRoute(deps, { qualifies })` gives `canEstablishTradeRoute` and `tradeRouteCriteria`, for a unit
    with `TradeMissions` and a home city: any foreign city (not from the sea), or another of its own player's cities
    when the ruleset's `qualifies(home, city)` holds.
  - `worker`: `terrainJob(deps, Improvement, ...extra)`, for building `Improvement` on the unit's own tile where an
    `Available` rule allows it, with the ruleset's own `extra` criteria last (such as what counts as water nearby);
    `requiresImprovement(deps, Improvement)`, for an `extra` that needs one improvement on `to` before another;
    `terrainConversion(TerrainTypes, ...extra)`, for changing the terrain of a tile that is one of `TerrainTypes` (the
    ruleset's conversion table); and `cleanPollution(deps, Pollution)`. Each is for a unit that `Terraforms`.
  - `transport`: `transport(deps)` gives `embarkCriteria` (a land unit boarding its player's `NavalTransport` with room
    on neighbouring water that holds no foreign unit), `disembarkCriteria` (leaving a transport, asking
    `transportRegistry.hasUnit` first, as it is nearly always false) and `unloadCriteria`.
  - `orders`: `orders(deps)` gives the criteria for the orders a unit is given on its own tile: `fortifyCriteria`,
    `sleepCriteria`, `activateCriteria`, `disbandCriteria`, `noOrdersCriteria`, `foundCityCriteria`, `joinCityCriteria`
    (with base-unit-action-join-city's `joinableCity`), `setHomeCityCriteria`, `exploreCriteria` and
    `automateCriteria`, each its own list so a ruleset can add to one.

A library: it has no `main` and registers no rules. See `civ1-unit` for Civilization's unit actions.
