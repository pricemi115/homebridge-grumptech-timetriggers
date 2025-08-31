# Change Log
Change history for _homebridge-grumptech-timetriggers_

---
---
## [1.4.3] - 2025-AUG-30 🎉🎊
### What's new ✨
GrumpTech TimeTriggers is now Homebridge Certified
---
## [1.4.2] - 2025-AUG-30 🌞
### Fixes 🐛
- [Issue #125](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/125): Handle invalid configuration without causing restart loop.
##### **Note: Restarting homebridge may be necessary when upgrading from a version 1.3.8 or earlier.**
---
## [1.4.1] - 2025-JAN-01 🥳🍾
### Fixes 🐛
- Updating package.json to include a _homepage_ field.
##### **Note: Restarting homebridge may be necessary when upgrading from a version 1.3.8 or earlier.**
---
## [1.4.0] - 2025-JAN-01 🥳🍾
### What's new ✨
- [Issue #103](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/103): Updates to support Homebridge v2.
- [Issue #103](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/103): Eliminted the now-obsolete [Time Information](https://developers.homebridge.io/#/service/TimeInformation) service, which was used to indicate the scheduled trip date and time.
- Updated dependencies.
##### **Note: Restarting homebridge may be necessary when upgrading from a previous version.**
---
## [1.3.8] - 2023-DEC-02
### Fixes 🐛
- [Issue #101](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/101): Fixed an issue causing scheduled triggers to become inoperative when arming.
- Updated dependencies.
---
## [1.3.7] - 2023-AUG-16
### What's new ✨
- Moved astronomical data processing into its own module and imported that module.
---
## [1.3.6] - 2023-JUL-04 🇺🇸🎆
### What's new ✨
- [Issue #77](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/77): Allow users to specify a 'backup time' to use for astronomical triggers. This time is used when activating the trigger and the astronomical service is not available or the astronomical type is not available for the scheduled trip day.
---
## [1.3.5] - 2023-JUN-17
### Fixes 🐛
- [Issue #70](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/70): Fixed an issue causing scheduled triggers to fail to function.
---
## [1.3.4] - 2023-MAY-01
### Fixes 🐛
- [Issue #52](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues/52): Fixed an issue causing scheduled triggers to trip more than once per day when the trip tolerance exceeded the trip duration.
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
