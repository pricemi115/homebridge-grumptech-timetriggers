/* eslint-disable new-cap */
/**
 * @description Manages a scheduled trigger event.
 * @copyright January 2023
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
import {TRIGGER_STATES, TRIGGER_DAYS} from './triggerTypes.mjs';
import {TimeTrigger} from './timeTrigger.mjs';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase, no-unused-vars
const _debug_proces = _debugModule('scheduled_trigger');

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
     * @param {string=} config.identifier - Identifier
     * @param {number} config.days - Bitmask of days of the week to schedule the trigger.
     * @param {object} config.time - Structure of time to trip the trigger
     * @param {object} config.time.nominal - Earliest time to trip the trigger.
     * @param {number} config.time.nominal.hour - Hour (0-23)
     * @param {number} config.time.nominal.minute - Minute (0-59)
     * @param {object} config.time.tolerance - Latest time to trip the trigger.
     * @param {number} config.time.tolerance.hour - Hour (0-23)
     * @param {number} config.time.max.minute - Minute (0-59)
     * @param {object=} config.duration - Range of times for the tripped duration.
     * @param {number} config.duration.nominal - Minimum time, in milliseconds for the tripped duration.
     * @param {number} config.duration.tolerance - Maximum time, in milliseconds for the tripped duration.
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @throws {RangeError} - Thrown if 'config' is invalid.
     * @class
     * @private
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
            // Validate the time.
            ScheduledTrigger._checkTime(config.time);
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

        // Set the scheduled time.
        if (_is.not.undefined(config) &&
            _is.not.undefined(config.time)) {
            this._time = config.time;
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

        this._triggerDelta = this._computeTriggerTimeDelta(this._time);
    }

    /**
     * @description Generates new timeout values for the timer.
     * @returns {void}
     */
    _generateNewTimerValues() {
        // Determine the current day so we can see when the next alarm is due.
        const now = new Date();
        const dayOfWeek = now.getDay();
        const date = now.getDate();

        if (dayOfWeek > MAX_DAY) {
            throw new RangeError(`Unexpected day. day=${dayOfWeek}`);
        }

        // Build an array of candicates.
        let count = 0;
        const triggerDays = [];
        let nextTriggerDay = dayOfWeek;
        while (count <= MAX_DAY) {
            const candidate = (1 << nextTriggerDay);
            if ((candidate & this._days)  !== 0) {
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

        // Get the number of days from now until the minimum trigger time
        const deltaDaysMin = this._computeDeltaDays(dayOfWeek, triggerDays[0]);
        dateMin.setDate(date + deltaDaysMin);

        // Made a Date for the maximum trigger.
        const dateMax = new Date(dateMin);
        dateMax.setMilliseconds(dateMax.getMilliseconds() + this._triggerDelta);

        // Manage the trigger window
        if (dateMin < now) {
            if (dateMax >= now) {
                // The scheduled minimum trigger has already occured, set the minumum to now.
                dateMin = now;
            }
            else {
                let offsetDays = 0;
                // The scheduled minumum and maximum triggers have already occured.
                if (triggerDays.length > 1) {
                    offsetDays = this._computeDeltaDays(dayOfWeek, triggerDays[1]);
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
        super._generateNewTimerValues();
    }

    /**
     * @description Helper to compute the number of days between day numbers.
     * @param {number} dayReference - Day of the week for the reference day
     * @param {number} dayTarget - Day of the week for the reference day
     * @returns {number} - Number of days
     * @throws {TypeError} - Thrown if the types are not as expected.
     * @throws {RangeError} - Thrown if either the argument is not in the range [0..6]
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
        maxTrigger.setHours(minTrigger.getHours() + time.tolerance.hour);
        maxTrigger.setMinutes(minTrigger.getMinutes() + time.tolerance.minute);

        // Compute the time between the triggers.
        if (maxTrigger < minTrigger) {
            // Roll the max trigger forward by one day.
            maxTrigger.setDate(maxTrigger.getDate() + 1);
        }

        // Compute the number of milliseconds between the timers.
        const triggerDelta = maxTrigger - minTrigger;

        return triggerDelta;
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
     * @returns {void}
     * @throws {TypeError} - Thrown if the types are not as expected.
     * @throws {RangeError} - Thrown if either the hour or minute are out of range.
     */
    static _checkTime(time) {
        if (_is.not.undefined(time)) {
            if (_is.not.object(time) ||
                _is.not.object(time.nominal) ||
                _is.not.number(time.nominal.hour) ||
                _is.not.number(time.nominal.minute) ||
                _is.not.object(time.tolerance) ||
                _is.not.number(time.tolerance.hour) ||
                _is.not.number(time.tolerance.minute)) {
                throw new TypeError(`time is invalid.`);
            }
            if (_is.not.within(time.nominal.hour, (MIN_HOUR-1), (MAX_HOUR+1)) ||
                _is.not.within(time.nominal.minute, (MIN_MINUTE-1), (MAX_MINUTE+1)) ||
                _is.not.within(time.tolerance.hour, (MIN_HOUR-1), (MAX_HOUR+1)) ||
                _is.not.within(time.tolerance.minute, (MIN_MINUTE-1), (MAX_MINUTE+1))) {
                throw new RangeError(`range is invalid.`);
            }
        }
    }
}
