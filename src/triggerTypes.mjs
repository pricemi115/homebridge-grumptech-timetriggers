/**
 * @description Common type definitions and enumerations for triggers.
 * @copyright January 2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TriggerTypes
 */

/**
 * @description Enumeration of the trigger states
 * @private
 * @readonly
 * @enum {number}
 * @property {number} MultiTrip - Triggering multiple times per day
 * @property {number} Daily - Trips once per day
 */
export const TRIGGER_TYPES = {
    /* eslint-disable key-spacing */
    MultiTrip   : 0,
    Daily       : 1,
    /* eslint-enable key-spacing */
};

/**
 * @description Enumeration of the trigger states
 * @private
 * @readonly
 * @enum {number}
 * @property {number} Inactive- Trigger Inactive
 * @property {number} Armed - Trigger Armed
 * @property {number} Triggered - Trigger Tripped
 */
export const TRIGGER_STATES = {
    /* eslint-disable key-spacing */
    Inactive  : 0,
    Armed     : 1,
    Triggered : 2,
    /* eslint-enable key-spacing */
};

/**
 * @description Enumeration of the days of the week
 * @private
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
