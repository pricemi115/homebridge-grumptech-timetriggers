# Change Log
Change history for _homebridge-grumptech-timetriggers_

---
---

## [1.3.5] - 2023-JUN-17
### Fixes 🐛
- [Issue #70](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/70): Fixed and issue causing scheduled triggers to fail to function.
---
## [1.3.4] - 2023-MAY-01
### Fixes 🐛
- [Issue #52](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/52): Fixed and issue causing scheduled triggers to trip more than once per day when the trip tolerance exceeded the trip duration.
---
## [1.3.3] - 2023-APR-24
### Fixes 🐛
- [Issue #46](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/46): We appologize for totally breaking fixed schedule (non-astronomical) triggers. Scheduled triggers work correctly now. Sorry for missing a silly error.
---

## [1.3.2] - 2023-APR-21
### Fixes
- [Issue #42](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/42): Handle special cases when a subset of the astrological events are not valid on a specific day.

---
## [1.3.1] - 2023-APR-19
### Fixes
- Trip Time did not show up in the plug-in settings when Astronomical Triggers was _not_ set.

---
## [1.3.0] - 2023-APR-19
### What's new
- [Issue #5](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/5): Add support for astronomical triggers. 🌞 🌖

### Fixes
- [Issue #24](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/24): Periodically resynch active scheduled triggers. Note: May take up to 1 minute for a trigger to update.

---
## [1.2.0] - 2023-MAR-20
### What's new
- [Issue #23](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/23): Add a service to see the amount of time remaining before the next trigger event.

---
## [1.1.0] - 2023-MAR-12
### What's new
- [Issue #16](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/16): Implemented a cap to the number of times a trigger will trip when enabled.

### Fixes
- [Issue #22](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/22) - Fixed issues where invalid setings would result in an exception/crash on startup.

---
## [1.0.0] - 2023-MAR-07
### What's new
- Initial (official) release
