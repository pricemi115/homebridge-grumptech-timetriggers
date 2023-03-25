/**
 * @description Common type definitions and enumerations for triggers.
 * @copyright 2023-2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TriggerTypes
 */

/**
 * @description Enumeration of the trigger states
 * @readonly
 * @enum {number}
 * @property {number} TimedTrigger - Trigger that based on a time interval and duration
 * @property {number} ScheduledTrigger - Trigger configured to trip on a day/hour/minute and remained tripped for a specified duration
 */
export const TRIGGER_TYPES = {
    /* eslint-disable key-spacing */
    TimedTrigger   : 0,
    ScheduledTrigger       : 1,
    /* eslint-enable key-spacing */
};

/**
 * @description Enumeration of the trigger states
 * @private
 * @readonly
 * @enum {number}
 * @property {number} Inactive- Trigger Inactive
 * @property {number} Arming - Trigger Arming
 * @property {number} Armed - Trigger Armed
 * @property {number} Tripped - Trigger Tripped
 */
export const TRIGGER_STATES = {
    /* eslint-disable key-spacing */
    Inactive  : 0,
    Arming    : 1,
    Armed     : 2,
    Tripped   : 3,
    /* eslint-enable key-spacing */
};

/**
 * @description Enumeration of the days of the week
 * @readonly
 * @enum {number}
 * @property {number} Sunday - Sunday
 * @property {number} Monday - Monday
 * @property {number} Tuesday - Tuesday
 * @property {number} Wednesday - Wednesday
 * @property {number} Thursday - Thursday
 * @property {number} Friday - Friday
 * @property {number} Saturday - Saturday
 * @property {number} Weekday - Weekday
 * @property {number} Weekend - Weekend
 * @property {number} AllDays - All Days
 */
export const TRIGGER_DAYS = {
    /* eslint-disable key-spacing */
    Sunday    :   1,
    Monday    :   2,
    Tuesday   :   4,
    Wednesday :   8,
    Thursday  :  16,
    Friday    :  32,
    Saturday  :  64,
    /* Helpful Masks */
    Weekday   :  62,
    Weekend   :  65,
    AllDays   : 127,
    /* eslint-enable key-spacing */
};

/**
 * @description Enumeration of published events.
 * @readonly
 * @private
 * @enum {string}
 * @property {string} EVENT_STATE_CHANGED - Identification for the event published when the trigger state changes.
 * @property {string} EVENT_STATE_NOTIFY  - Identification for the event published when the trigger state does not change.
 */
export const TRIGGER_EVENTS = {
    /* eslint-disable key-spacing */
    EVENT_STATE_CHANGED : 'state_changed',
    EVENT_STATE_NOTIFY  : 'state_notify',
    /* eslint-enable key-spacing */
};
