# Copilot Instructions for homebridge-grumptech-timetriggers

## Project Overview
- This is a Homebridge dynamic platform plugin that creates motion sensors triggered by time-based events.
- Main integration is with [homebridge-config-ui-x](https://www.npmjs.com/package/homebridge-config-ui-x) for installation, configuration, and management.
- Each configured trigger creates a Homekit accessory with three services: switch, motion sensor, and light sensor.
- Scheduled triggers can be based on fixed times or astronomical events (via US Naval Observatory API).

## Key Files & Structure
- `src/` — Main source code for plugin logic and trigger state machines.
- `config.schema.json` — Defines configuration schema for triggers.
- `package.json` — Declares dependencies, build scripts, and plugin metadata.
- `webpack.config.js` — Webpack build configuration.
- `README.md` — Detailed usage, configuration, and architecture notes.
- `docs/` and `docs-dev/` — API documentation and design diagrams.

## Developer Workflows
- **Build:** Use `npm run build` (if defined) or run webpack directly for bundling.
- **Install:** `npm install -g homebridge-grumptech-timetriggers` for global install.
- **Debug:** Run Homebridge in debug mode to trace plugin behavior. Use child bridge mode for isolation.
- **Test:** No explicit test suite found; validate by running in Homebridge and checking accessory creation and event logs.

## Configuration Patterns
- Triggers are defined in the config under the root `triggers` array.
- Each trigger must have a unique `trigger_identifier` and specify its type (`Timed` or `Scheduled`).
- Scheduled triggers can use astronomical events by setting `is_astronomical: true` and specifying `astronomical_type`, `location:latitude`, and `location:longitude`.
- Days to trip are set using a bitmask (see README for mapping).

## Integration Points
- Communicates with Homebridge via dynamic accessory API.
- For astronomical triggers, queries USNO API and tags requests with `gt_trigr`.
- Designed for use with Homebridge UI-X for configuration and management.

## Project-Specific Conventions
- State machine design for trigger lifecycle (see `design/triggerStateMachine.*.mmd`).
- Accessories persist state across restarts.
- Light sensor service is repurposed to indicate minutes until next trigger event.
- Product Data field in accessory info is used to publish next event time (viewable in UI-X).

## Examples
- See `README.md` for configuration table and usage scenarios.
- Design diagrams in `design/` and API docs in `docs/` clarify architecture and data flow.

---
For questions about unclear patterns or missing details, review `README.md` and design docs, or ask for clarification from maintainers.
