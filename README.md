# Homebridge Time Triggers

[Homebridge Time Triggers](https://github.com/pricemi115/homebridge-grumptech-timetriggers), by [GrumpTech](https://github.com/pricemi115/), is a [Homebridge](https://homebridge.io) dynamic platform plug-in that publishes a motion sensor, where the motion detected is a time-based event.

## Change Log
The change history can be viewed [here](./CHANGELOG.md)

## Security Policy
Please refer to our [security policy](./SECURITY.md) for information on which versions are receiving security updates and how to report security vulnerabilities.

## Installation

This plug-in is intended to be used with the [homebridge-config-ui-x](https://www.npmjs.com/package/homebridge-config-ui-x) homebridge management tool. If using _homebridge-config-ui-x_, simply search for _homebridge-grumptech-timetriggers_ for installation, plug-in management, and configuration.

To install the plugin manually:
<br>_`npm install -g homebridge-grumptech-timetriggers`_

## Configuration
### _homebridge-config-ui-x_
This plugin is best experienced when running as a module installed and managed by the [_homebridge-config-ui-x_](https://www.npmjs.com/package/homebridge-config-ui-x) plugin. When running under homebridge-config-ui-x, visiting the plugin settings will allow you configure and manage the time-based triggers.<br/>
Additionally, especially if this system will be running other homebridge modules, it is strongly encouraged to run this plugin as an isolated child bridge. This setting page can be found by clicking on the _wrench_ icon on the plugin and then selecting _Bridge Settings_. With the child bridge enabled, revisiting the setting page after homebridge is rebooted will show a QR code for pairing the child bridge to your Homekit home.<br/>

### Configuration Settings
The plugin configuration consists of an array of objects containing the configuration for each trigger. The root name of the object containing this array is _triggers_.
| Setting | Description | Field Name | Parameter Type | Data Type | Units | Default | Minimum or Allowed Values | Maximum | Comments |
| :------: | :------: | :------: | :------: | :------: |:------: | :------: | :------: | :------: | :------: |
| Identifier | Uniqie identifier for the trigger | trigger_identifier | Per Trigger | String | N/A | Trigger | | | Must be unique. Controls trigger and Homekit accessory mapping. |
| Type | Type of trigger | trigger_type | Per Trigger | Number | N/A | Timed (0) | Timed (0), Scheduled(1) | | |
| Trip Duration | The nminal time that a trigger reains in the tripped state. | duration:nominal | Per Trigger | Number | milliseconds | 250 | 10 | | |
| Trip Duration Tolerance | The random time to apply to the trip duration | duration:tolerance | Per Trigger | Number | milliseconds | 0 | 0 | | Allows for a random trip duration. |
| Trip Time | The nominal time for a trigger | timeout:nominal | Per Trigger | Number | milliseconds | 60000 | 1 | | Applies to _Timed_ triggers only. |
| Trip Time Tolerance | The random to apply to the trigger | timeout:tolerance | Per Trigger | Number | milliseconds | 0 | 0 | | Applies to _Timed_ triggers only. |
| Scheduled Trip Hour | The nominal hour to schedule a trigger to trip | time:nominal:hour | Per Trigger | Number | Hour of the Day | 12 | 0 | 23 | Applies to _Scheduled_ triggers only. |
| Scheduled Trip Minute | The nominal minute to schedule a trigger to trip | time:nominal:minute | Per Trigger | Number | Minute of the Hour | 0 | 0 | 59 | Applies to _Scheduled_ triggers only. |
| Scheduled Trip Hour Tolerance | The tolarance to appply to the hour of a scheduled trigger | time:tolerance:hour | Per Trigger | Number | Hours | 0 | 0 | 23 | Applies to _Scheduled_ triggers only. |
| Scheduled Trip Minute Tolerance | The tolarance to appply to the minute of a scheduled trigger | time:tolerance:minute | Per Trigger | Number | Minutes | 0 | 0 | 59 | Applies to _Scheduled_ triggers only. |
| Days to Trip | Bitmask of the days to trip the trigger | days | Per Trigger | Number | | 127 | 1 | 127 |  Applies to _Scheduled_ triggers only.</br>1:Sunday, 2:Monday, 4:Tuesday, 8:Wednesday,</br>16:Thursday, 32:Friday, 64:Saturday |
| Is Astronomical | Flag indicating that the scheduled trigger source is an astronomical event | is_astronomical | Per Trigger | Boolean | | False | True, False | | Applies to _Scheduled_ triggers only |
| Astronomical Type | Type of astronomical event | astronomical_type | Per Trigger | String | | sunset | moon_rise, moon_set, sunrise, sunset, twilight_end, twilight_start, lunar_transit, solar_transit | | Applies to _Scheduled_ triggers only |
| Latitude | Location latitude for the astronomical event | location:latitude | Per Trigger | Number | | 0 | -90 | 90 | Applies to _Scheduled_ triggers only</br>north-positive format |
| Longitude | Location longitude for the astronomical event | location:longitude | Per Trigger | Number | | 0 | -180 | 180 | Applies to _Scheduled_ triggers only</br>east-positive format |
| Trip Limit | Place a cap on the number of sequential trip events | trip_limit | Per Trigger | Number | | 0 | 0 | | A value of 0 diables the limit and the trigger will re-arm indefinitely |

## Usage
The plugin will create, or restore, a dynamic accessory for each trigger specified in the configuration. Each accessory will advertise four services: (1) switch, (1) motion sensor, (1) light sensor, and (1) time information.

The control switch will enable/disable the trigger. The state of this setting is saved and will be restored to the last known state upon restart.</br>
The motion sensor will report that motion is detected when the trigger is in the tripped state. Otherwise, there will be no motion detected.</br>
The light sensor will be used to indicate the time, in minutes, until the next trigger event.</br>
The time informaiton service is used to indicate the time, in the local timezone, of the next trigger event. However, to date, no Homekit app has been found that resolves this service. This service is only accessible via the [_homebridge-config-ui-x_](https://www.npmjs.com/package/homebridge-config-ui-x) web view on the `Accessories` page.</br>

The plugin supports an option to configue _scheduled triggers_ to be based on astronomical events. The supported events are: sunrise, sunset, twilight start, twilight end, moon rise, moon set, solar transit, lunar transit. The plugin determines the time of these events by using the API proviced by the [United States Naval Observatory](https://aa.usno.navy.mil/data/api). When issuing these querries, the plugin with tag the requests with the identifier `gt_trigr`. The plugin only uses the configured location (latitude, longitude) solely for the purppose of querring for the astronomical events.

Some example use cases are:</br>
1. Use the Scheduled Trigger to control lights that turn on/off randomly within a user specified window to give the appearance of being home when you are away on holiday.
2. Use the Timed Trigger with a limit of 1 to provide the capability of delayed control of various accessories. For example to turn the lighs off in 30 minutes.

## Known Issues and Planned Enhancements
Refer to the bugs and enhancements listed [here](https://github.com/pricemi115/homebridge-grumptech-timetriggers/issues)

## Contributing
1. Fork it!
2. Create your feature/fix branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## Credits
Many thanks to all the folks contributing to [Homebridge](https://homebridge.io) and to [oznu](https://github.com/oznu) for [homebridge-config-ui-x](https://www.npmjs.com/package/homebridge-config-ui-x), allowing for the possibility of this sort of fun and learning.

## License
Refer to [LICENSE.md](./LICENSE.md) for information regarding licensincg of this source code.
