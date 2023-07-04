/* eslint-disable new-cap */
/**
 * @description Manages a scheduled trigger event.
 * @copyright 2023-2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TimeTriggerModule
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 */

// External dependencies and imports.
import _debugModule from 'debug';
import _is from 'is-it-check';

// Internal dependencies
import {TRIGGER_STATES, TRIGGER_DAYS, ASTRONOMICAL_TRIGGERS, TIME_OFFSET_TYPES} from './triggerTypes.mjs';
import {TimeTrigger} from './timeTrigger.mjs';
import {TRIGGER_ACTIONS} from './triggerStateBase.mjs';
import {ASTRONOMICAL_DATA_EVENTS, AstronomicalData} from './astronomicalDataService.mjs';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase, no-unused-vars
const _debug = _debugModule('scheduled_trigger');

/**
 * @description Minimum day (Sunday)
 * @private
 */
const MIN_DAY = 0;
/**
 * @description Maximum day (Saturday)
 * @private
 */
const MAX_DAY = 6;
/**
 * @description Minimum minute
 * @private
 */
const MIN_MINUTE = 0;
/**
 * @description Maximum minute
 * @private
 */
const MAX_MINUTE = 59;
/**
 * @description Minimum hour
 * @private
 */
const MIN_HOUR = 0;
/**
 * @description Maximum hour
 * @private
 */
const MAX_HOUR = 23;

/**
 * @description Flag value for an invalid timeout
 * @private
 */
const INVALID_TIMEOUT_ID = -1;

/**
 * @description Tolerance for checking/validating active timeouts.
 * @private
 */
const REMAINING_TIME_TOLERANCE = 500/* milliseconds */;

/**
 * @description Period for checking/validating active timeouts.
 * @private
 */
const REMAINING_TIME_CHECK_PERIOD = 60000/* milliseconds */;

/**
 * @description Time Trigger state changed notification
 * @event module:TimeTriggerModule#event:state_changed
 * @type {object}
 * @param {string} e.uuid - Unique identifier of the trigger
 * @param {TRIGGER_STATES} e.new_state - New trigger state
 * @param {TRIGGER_STATES} e.old_state - Previous trigger state
 * @private
 */
/**
 * @description Time Trigger state notification
 * @event module:TimeTriggerModule#event:state_notify
 * @type {object}
 * @param {string} e.uuid - Unique identifier of the trigger
 * @param {TRIGGER_STATES} e.current_state - Current trigger state
 * @private
 */
/**
 * @description Trigger for scheduled events.
 * @augments TimeTrigger
 */
export class ScheduledTrigger extends TimeTrigger {
    /**
     * @description Constructor
     * @param {object} config - Configuration data
     * @param {string} [config.identifier] - Identifier
     * @param {module:TriggerTypes.TRIGGER_DAYS} [config.days] - Bitmask of days of the week to schedule the trigger.
     * @param {ASTRONOMICAL_TRIGGERS} [config.astronomical_type] - Type of astronomical trigger. Not used if not astronomical.
     * @param {object} config.time - Structure of time to trip the trigger
     * @param {object} [config.time.astronomical_offset] - Offset from the astronomical event. Not used if not astronomical.
     * @param {TIME_OFFSET_TYPES} config.astronomical_offset.type - Type of offset.
     * @param {number} config.time.astronomical_offset.hour - Hour (0-23)
     * @param {number} config.time.astronomical_offset.minute - Minute (0-59)
     * @param {object} [config.time.nominal] - Nominal time to trip the trigger. Not used if astronomical.
     * @param {number} config.time.nominal.hour - Hour (0-23)
     * @param {number} config.time.nominal.minute - Minute (0-59)
     * @param {object} config.time.tolerance - Tolerance around the nominal time to trip the trigger.
     * @param {number} config.time.tolerance.hour - Hour (0-23)
     * @param {number} config.time.tolerance.minute - Minute (0-59)
     * @param {object} [config.duration] - Range of times for the tripped duration.
     * @param {number} config.duration.nominal - Minimum time, in milliseconds for the tripped duration.
     * @param {number} config.duration.tolerance - Maximum time, in milliseconds for the tripped duration.
     * @param {object} [config.location] - Location used when trigger is astronomical. ** Required for Astronomical Triggers.
     * @param {number} config.location.latitude - Latitude
     * @param {number} config.location.longitude - Longitude
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @throws {RangeError} - Thrown if 'config' is invalid.
     * @class
     */
    constructor(config) {
        // Validate arguments
        if (_is.not.undefined(config)) {
            if ((_is.not.object(config) ||
                (_is.not.undefined(config.days) && _is.not.number(config.days)))) {
                throw new TypeError(`Invalid configuration.`);
            }
            if (_is.not.undefined(config.days) && _is.not.within(config.days, (TRIGGER_DAYS.Sunday-1), (TRIGGER_DAYS.AllDays+1))) {
                throw new RangeError(`Invalid configuration. Days=${config.days}`);
            }
            // Validate the astronomical type.
            if (_is.not.undefined(config.astronomical_type) &&
                _is.not.inArray(config.astronomical_type, Object.values(ASTRONOMICAL_TRIGGERS))) {
                throw new RangeError(`Invalid configuration. Astronomical Type=${config.astronomical_type}`);
            }
            if (_is.not.undefined(config.astronomical_type)) {
                AstronomicalData.CheckLocation(config);
            }

            // Validate the time.
            ScheduledTrigger._checkTime(_is.not.undefined(config.astronomical_type), config.time);
        }

        // Initialize the base class.
        super(config);

        // Set the days.
        if (_is.not.undefined(config) &&
            _is.not.undefined(config.days)) {
            this._days = config.days;
        }
        else {
            // Set to the default of all days.
            this._days = TRIGGER_DAYS.AllDays;
        }

        // Set the astronomical type. (May be undefined)
        if (_is.not.undefined(config)) {
            this._astronomicalType = config.astronomical_type;
        }

        // Set the scheduled time.
        if (_is.not.undefined(config) &&
            _is.not.undefined(config.time)) {
            this._time = config.time;
            if (_is.undefined(this._time.nominal)) {
                this._time.nominal = {hour: -1, minute: -1};
            }
            if (_is.undefined(this._time.tolerance)) {
                this._time.tolerance = {hour: 0, minute: 0};
            }
        }
        else {
            // Set to the default to 1 Minute from now.
            const trigger = new Date();
            trigger.setMinutes(trigger.getMinutes() + 1);
            /* eslint-disable indent */
            /* eslint-disable key-spacing */
            this._time = {nominal:   {hour: trigger.getHours(), minute: trigger.getMinutes()},
                          tolerance: {hour: 0, minute: 0}};
            /* eslint-enable indent */
            /* eslint-enable key-spacing */
        }

        // Trigger type-specific initialization.
        if (_is.not.undefined(config) &&
            _is.not.undefined(this._astronomicalType)) {
            // Cache the location
            this._location = config.location;

            // Commpute and the astronomical offset in minutes
            let offsetPolarity = 0.0;
            switch (config.time.astronomical_offset.type) {
                case TIME_OFFSET_TYPES.TYPE_BEFORE: {
                    offsetPolarity = -1.0;
                    break;
                }
                case TIME_OFFSET_TYPES.TYPE_AFTER: {
                    offsetPolarity = 1.0;
                    break;
                }
                default: {
                    offsetPolarity = 0.0;
                    break;
                }
            }
            this._astronomicalOffset = offsetPolarity * ((config.time.astronomical_offset.hour * 60.0) +
                                                         config.time.astronomical_offset.minute);

            // Create the astronomical helpwe and register for events of interest.
            this._astroHelper = new AstronomicalData();
            this._astroHelper.on(ASTRONOMICAL_DATA_EVENTS.EVENT_DATA_PROCESS_COMPLETE, this._processAstronomicalResults.bind(this));
        }
        else {
            // Fixed schedule. Compute the trigger time delta now.
            this._triggerDelta = this._computeTriggerTimeDelta(this._time);
        }

        // Data for managing updates to the system time (ex. DST time changes)
        this._CB_checkTimeRemaining = this._on_CheckTimeRemainingTripped.bind(this);
        this._lastTimeRemaining = -1;
        this._checkTimeoutID = INVALID_TIMEOUT_ID;
        // Used to support unit tests
        this._remainingTimeCheckPeriod = REMAINING_TIME_CHECK_PERIOD;

        // Date of the last trip
        this._lastTripTime = undefined;
    }

    /**
     * @description Enter Idle State
     * @returns {boolean} Always return true.
     */
    EnterIdle() {
        // Reset the date of the last trip
        this._lastTripTime = new Date(0);

        // Defer to the base class.
        super.EnterIdle();

        return true;
    }

    /**
     * @description Enter Arming State
     * @returns {boolean} Always return true.
     */
    EnterArming() {
        // If the scheduled trigger is not configured as astronomical,
        // defer to the base class.
        if (_is.undefined(this._astroHelper)) {
            // This will automatically kick us to Armed.
            super.EnterArming();
        }
        else {
            // Astronomical setting. Just perform the state change.
            this._doStateChange(this._armingState);
        }

        return true;
    }

    /**
     * @description Enter Tripped State
     * @returns {boolean} Always return true.
     */
    EnterTripped() {
        // Update the last trip time.
        this._lastTripTime = new Date();

        // Clear the check timer, we don't need it anymore.
        this._clearCheck();

        // Defer to the base class.
        super.EnterTripped();

        return true;
    }

    /**
     * @description Generates new timeout values for the timer.
     * @returns {void}
     * @private
     */
    GenerateNewTimerValues() {
        // If the scheduled trigger is not configured as astronomical,
        // generate the next time now.
        if (_is.undefined(this._astroHelper)) {
            this._doGenerateNewTimerValues();
        }
        else {
            // Get th current time
            const now = new Date();
            this._makeAstronomicalRequest(now);
        }
    }

    /**
     * @description Helper to start the trigger timer.
     * @param {number} timeout - Timeout period, in milliseconds
     * @returns {void}
     * @throws {TypeError} - thrown if timeout is not a number
     * @throws {RangeError} - thrown if the timeout is not positive
     * @private
     */
    DoStart(timeout) {
        // Defer to base class.
        super.DoStart(timeout);

        // Initialize the last known amount of time remaining.
        this._lastTimeRemaining = this.TimeRemaining;
        this._remainingTimeCheckPeriod = REMAINING_TIME_CHECK_PERIOD;
        this._checkTimeoutID = setInterval(this._CB_checkTimeRemaining, this._remainingTimeCheckPeriod);
    }

    /**
     * @description Helper to stop the trigger timer.
     * @returns {void}
     * @private
     */
    _doStop() {
        // Defer to base class.
        super._doStop();

        // Clear the check .
        this._clearCheck();
    }

    /**
     * @description Helper to clear the check timer
     * @returns {void}
     * @private
     */
    _clearCheck() {
        // Clear the check .
        if (this._checkTimeoutID !== INVALID_TIMEOUT_ID) {
            clearInterval(this._checkTimeoutID);
            this._checkTimeoutID = INVALID_TIMEOUT_ID;
        }
    }

    /**
     * @description Helper to post a request for astronomical results.
     * @param {Date} date - Date for the request.
     * @returns {void}
     * @private
     */
    _makeAstronomicalRequest(date) {
        // Astronomical setting. Request the astronomical data.
        this._astroHelper.RequestAstronomicalOneDayData({id: 'gt_trigr', date: date, location: this._location});
    }

    /**
     * @description - Event handler to process the astronomical request results and manage the dtate.
     * @param {object} e - Event notification data
     * @param {boolean} e.status - Error indicator (false==no error)
     * @returns {void}
     * @private
     */
    _processAstronomicalResults(e) {
        _debug(`Received Astro Results. status=${e.status}`);

        // Manage the state change
        // Note: Even if there was an error getting the astronimical results,
        //       when we have previously established the event time, we will just use
        //       the previous results.
        if (((_is.undefined(e) || _is.undefined(e.status) ||
              _is.truthy(e.status)))) {
            if (_is.not.undefined(this._time) &&
                _is.not.undefined(this._time.nominal)) {
                // Update the new timer values using the default.
                this._triggerDelta = this._computeTriggerTimeDelta(this._time);
                this._doGenerateNewTimerValues();
            }
            else {
                // Abort.
                this._currentState.Evaluate(TRIGGER_ACTIONS.Abort);
            }
        }
        else {
            // Get the astronomical time.
            const triggerDate = this._astroDateTime;
            // Extract the time of the desired 'phenomena', if the results indicate so.
            if (this._astroHelper.Valid) {
                // Set the 'nominal' time
                if (_is.not.undefined(triggerDate)) {
                    this._time.nominal.hour = triggerDate.getHours();
                    this._time.nominal.minute = triggerDate.getMinutes();
                }
            }

            if ((this.Timeout > 0) ||
                (_is.not.undefined(triggerDate))) {
                // Update the new timer values.
                this._triggerDelta = this._computeTriggerTimeDelta(this._time);
                this._doGenerateNewTimerValues();

                // Ensure that the resulting trigger occurs on the same day as our request.
                const astroDay = this._astroHelper.Date;
                const tripDate = new Date(Date.now() + this._timeout.nominal);

                if ((astroDay.getFullYear() == tripDate.getFullYear()) &&
                    (astroDay.getMonth() == tripDate.getMonth()) &&
                    (astroDay.getDate() == tripDate.getDate())) {
                    // Move on
                    setImmediate(() => {
                        this._currentState.Evaluate(TRIGGER_ACTIONS.Next);
                    });
                }
                else {
                    // The event has passed. Make another request.
                    _debug(`Requery for trigger time: day=${tripDate.toString()}`);
                    // Decouple the request.
                    setImmediate(() => {
                        this._makeAstronomicalRequest(tripDate);
                    });
                }
            }
            else {
                // Do we have a default time to work with? Could be the previous trigger time.
                // Note: The desired trigger may be invalid on this particular date, so use what we have.
                if (_is.not.undefined(this._time) &&
                    _is.not.undefined(this._time.nominal)) {
                    // Update the new timer values using the last known values.
                    this._triggerDelta = this._computeTriggerTimeDelta(this._time);
                    this._doGenerateNewTimerValues();
                }
                else {
                    // Abort.
                    this._currentState.Evaluate(TRIGGER_ACTIONS.Abort);
                }
            }
        }
    }

    /**
     * @description Generates new timeout values for the timer.
     * @returns {void}
     * @private
     */
    _doGenerateNewTimerValues() {
        // Determine the current day so we can see when the next alarm is due.
        const now = new Date();
        const dayOfWeek = now.getDay();
        const date = now.getDate();

        if (dayOfWeek > MAX_DAY) {
            throw new RangeError(`Unexpected day. day=${dayOfWeek}`);
        }

        // Build an array of candidates.
        let count = 0;
        const triggerDays = [];
        let activeTriggeredDayIndex = 0;
        let nextTriggerDay = dayOfWeek;
        while (count <= MAX_DAY) {
            const candidate = (1 << nextTriggerDay);
            if ((candidate & this._days) !== 0) {
                // Add the candidate
                triggerDays.push(nextTriggerDay);
            }

            nextTriggerDay++;
            if (nextTriggerDay > MAX_DAY) {
                nextTriggerDay = 0;
            }

            count++;
        }

        // Make a Date for the minimum trigger.
        let dateMin = new Date(now);
        // Update the times appropriately.
        dateMin.setHours(this._time.nominal.hour);
        dateMin.setMinutes(this._time.nominal.minute);
        dateMin.setSeconds(0);
        dateMin.setMilliseconds(0);
        // Adjust for the tolerance
        dateMin.setTime(dateMin.getTime() - (this._triggerDelta/2));

        // Get the number of days from now until the minimum trigger time
        const deltaDaysMin = this._computeDeltaDays(dayOfWeek, triggerDays[activeTriggeredDayIndex]);
        dateMin.setDate(date + deltaDaysMin);

        // Made a Date for the maximum trigger.
        const dateMax = new Date(dateMin);
        // Adjust for the tolerance
        dateMax.setTime(dateMax.getTime() + this._triggerDelta);

        // Manage the trigger window
        if (dateMin < now) {
            let rescheduleTrigger = false;
            if (dateMax >= now) {
                // Since we are within the originally scheduled window,
                // make sure the last trigger was not within the original window
                if ((dateMin <= this._lastTripTime) &&
                    (dateMax >= this._lastTripTime)) {
                    // Move to the next configured day.
                    rescheduleTrigger = true;
                }
                else {
                    // The scheduled minimum trigger has already occured, set the minumum to now.
                    dateMin = now;
                }
            }
            else {
                rescheduleTrigger = true;
            }
            // Reschedule the trigger.
            if (_is.truthy(rescheduleTrigger)) {
                let offsetDays = 0;
                if (triggerDays.length > (activeTriggeredDayIndex + 1)) {
                    activeTriggeredDayIndex += 1;
                    offsetDays = this._computeDeltaDays(dayOfWeek, triggerDays[activeTriggeredDayIndex]);
                }
                else {
                    // The trigger is only once per week
                    offsetDays = MAX_DAY + 1;
                }

                // Update the trigger ranges
                dateMin.setDate(dateMin.getDate() + offsetDays);
                dateMax.setDate(dateMax.getDate() + offsetDays);
            }
        }

        // Update the trigger timeout window.
        // Compute the minumum time, in milliseconds, for the trigger.
        const minTime = dateMin - now;
        // Compute the maximum time, in milliseconds, for the trigger.
        const maxTime = dateMax - now;
        // Compute the tolerancce, in milliseconds for the trigger
        const toleranceTime = ((maxTime - minTime)/2);
        // Compute the nominal time, in milliseconds, for the trigger.
        let nominalTime = minTime + toleranceTime;
        // Cap the nominal at 0.
        if ((nominalTime < 0) && ((nominalTime+toleranceTime) >= 0)) {
            nominalTime = 0;
        }
        this._timeout = {nominal: nominalTime, tolerance: toleranceTime};

        // Defer to the base class.
        super.GenerateNewTimerValues();
    }

    /**
     * @description Helper to compute the number of days between day numbers.
     * @param {number} dayReference - Day of the week for the reference day
     * @param {number} dayTarget - Day of the week for the reference day
     * @returns {number} - Number of days
     * @throws {TypeError} - Thrown if the types are not as expected.
     * @throws {RangeError} - Thrown if either the argument is not in the range [0..6]
     * @private
     */
    _computeDeltaDays(dayReference, dayTarget) {
        if (_is.not.number(dayReference) ||
            _is.not.number(dayTarget)) {
            throw new TypeError(`Invalid day of week.`);
        }
        if (_is.not.within(dayReference, (MIN_DAY-1), (MAX_DAY+1)) ||
            _is.not.within(dayTarget, (MIN_DAY-1), (MAX_DAY+1))) {
            throw new ReferenceError(`Invalid day of week.`);
        }

        let dayDelta = 0;
        if (dayTarget >= dayReference) {
            dayDelta = dayTarget - dayReference;
        }
        else {
            dayDelta = (MAX_DAY - dayReference) + (dayTarget - MIN_DAY) + 1;
        }

        return dayDelta;
    }

    /**
     * @description Helper to validate time configuration parameters,
     * @param {object} time - Structure of time to trip the trigger
     * @param {object} time.nominal - Nominal time to trip the trigger.
     * @param {number} time.nominal.hour - Hour (0-23)
     * @param {number} time.nominal.minute - Minute (0-59)
     * @param {object} time.tolerance - Tolerance time around nominal to trip the trigger.
     * @param {number} time.tolerance.hour - Hour (0-23)
     * @param {number} time.tolerance.minute - Minute (0-59)
     * @returns {number} - total milliseconds, accounting for the tolerance, for the trigger.
     * @private
     */
    _computeTriggerTimeDelta(time) {
        // Make Dates for the nominal trigger.
        const nominalTrigger = new Date();
        nominalTrigger.setHours(time.nominal.hour);
        nominalTrigger.setMinutes(time.nominal.minute);
        nominalTrigger.setSeconds(0);
        nominalTrigger.setMilliseconds(0);
        // Compute the minimum trigger (earliest possible trip)
        const minTrigger = new Date(nominalTrigger);
        minTrigger.setHours(minTrigger.getHours() - time.tolerance.hour);
        minTrigger.setMinutes(minTrigger.getMinutes() - time.tolerance.minute);
        // Compute the maximum trigger (latest possible trip)
        const maxTrigger = new Date(nominalTrigger);
        maxTrigger.setHours(maxTrigger.getHours() + time.tolerance.hour);
        maxTrigger.setMinutes(maxTrigger.getMinutes() + time.tolerance.minute);

        // Compute the time between the triggers.
        if (maxTrigger < minTrigger) {
            // Roll the max trigger forward by one day.
            maxTrigger.setDate(maxTrigger.getDate() + 1);
        }

        // Compute the number of milliseconds between the minimum and maximum.
        const triggerDelta = maxTrigger - minTrigger;
        _debug(`Trigger delta in milliseconds: ${triggerDelta}`);

        return triggerDelta;
    }

    /**
     * @description Read-only accessor for the configured astronomical trigger.
     * @returns {Date | undefined} - Date of the configured astronomical event. Undefined if not an astronomical trigger.
     * @private
     */
    get _astroDateTime() {
        let date = undefined;

        if (_is.not.undefined(this._astroHelper) &&
            _is.not.undefined(this._astronomicalType) &&
            _is.truthy(this._astroHelper.Valid)) {
            switch (this._astronomicalType) {
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_LUNAR_TRANSIT: {
                    date = this._astroHelper.LunarTransit;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_RISE: {
                    date = this._astroHelper.LunarRise;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_SET: {
                    date = this._astroHelper.LunarSet;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SOALAR_TRANSIT: {
                    date = this._astroHelper.SolarTransit;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE: {
                    date = this._astroHelper.SolarRise;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET: {
                    date = this._astroHelper.SolarSet;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_START: {
                    date = this._astroHelper.TwilightStart;
                    break;
                }
                case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_END: {
                    date = this._astroHelper.TwilightEnd;
                    break;
                }
                default: {
                    // Not handled.
                    break;
                }
            }
        }

        // Adjust for the offset, if appropriate.
        if (_is.not.undefined(date) &&
            _is.not.undefined(this._astronomicalOffset)) {
            date.setMinutes(date.getMinutes() + this._astronomicalOffset);
        }

        return date;
    }

    /**
     * @description Event handler for checking and validating remaining time.
     * @returns {void}
     * @private
     */
    _on_CheckTimeRemainingTripped() {
        // Get the time remaining
        const timeRemaining = this.TimeRemaining;
        // Compute the expected time remaining
        const expectedTimeRemaining = this._lastTimeRemaining - this._remainingTimeCheckPeriod;
        // Update last known remaining time.
        this._lastTimeRemaining = timeRemaining;
        // Check the difference bwtween the actual and expected time remaining.
        if (_is.not.negative(timeRemaining) && _is.not.negative(expectedTimeRemaining) &&
            _is.above(Math.abs(timeRemaining - expectedTimeRemaining), REMAINING_TIME_TOLERANCE)) {
            _debug(`Remaining time out of spec: Actual=${timeRemaining} Expected=${expectedTimeRemaining}`);

            if (timeRemaining <= 0) {
                // Trigger has elapsed.

                // Kill current timer(s)
                this._doStop();

                // Move on
                setImmediate(() => {
                    _debug(`Forcing 'Next' state change`);
                    this._currentState.Evaluate(TRIGGER_ACTIONS.Next);
                });
            }
            else {
                // Reset the timer based on expectations.
                _debug(`Resetting timer to ${expectedTimeRemaining}`);
                this.DoStart(expectedTimeRemaining);
                // Force a state notification
                this._doStateChange(this._currentState);
            }
        }
    }

    /**
     * @description Helper to validate time configuration parameters,
     * @param {boolean} isAstronomical - Flag indicating that the time object is astronomical (or not).
     * @param {object} time - Structure of time to trip the trigger
     * @param {object} [time.nominal] - Nominal time to trip the trigger. Not used if astronomical.
     * @param {number} time.nominal.hour - Hour (0-23)
     * @param {number} time.nominal.minute - Minute (0-59)
     * @param {object} [time.astronomical_offset] - Offset from the astronomical event. Not used if not astronomical.
     * @param {number} time.astronomical_offset.hour - Hour (0-23)
     * @param {number} time.astronomical_offset.minute - Minute (0-59)
     * @param {object} time.tolerance - Tolerance time around nominal to trip the trigger.
     * @param {number} time.tolerance.hour - Hour (0-23)
     * @param {number} time.tolerance.minute - Minute (0-59)
     * @returns {void}
     * @throws {TypeError} - Thrown if the types are not as expected.
     * @throws {RangeError} - Thrown if either the hour or minute are out of range.
     * @private
     */
    static _checkTime(isAstronomical, time) {
        if (_is.not.undefined(time)) {
            if (_is.not.object(time) ||
                _is.not.boolean(isAstronomical) ||
                (_is.truthy(isAstronomical) &&
                 (_is.not.object(time.astronomical_offset) ||
                  _is.not.number(time.astronomical_offset.hour) ||
                  _is.not.number(time.astronomical_offset.minute))) ||
                _is.not.object(time.nominal) ||
                _is.not.number(time.nominal.hour) ||
                _is.not.number(time.nominal.minute) ||
                _is.not.object(time.tolerance) ||
                _is.not.number(time.tolerance.hour) ||
                _is.not.number(time.tolerance.minute)) {
                throw new TypeError(`time is invalid.`);
            }
            if ((_is.truthy(isAstronomical) &&
                 (_is.not.within(time.astronomical_offset.hour, (MIN_HOUR-1), (MAX_HOUR+1)) ||
                  _is.not.within(time.astronomical_offset.minute, (MIN_MINUTE-1), (MAX_MINUTE+1)))) ||
                _is.not.within(time.nominal.hour, (MIN_HOUR-1), (MAX_HOUR+1)) ||
                _is.not.within(time.nominal.minute, (MIN_MINUTE-1), (MAX_MINUTE+1)) ||
                _is.not.within(time.tolerance.hour, (MIN_HOUR-1), (MAX_HOUR+1)) ||
                _is.not.within(time.tolerance.minute, (MIN_MINUTE-1), (MAX_MINUTE+1))) {
                throw new RangeError(`range is invalid.`);
            }
        }
    }
}
