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
 * 
 */
export const TRIGGER_DAYS = {
    /* eslint-disable key-spacing */
    Sunday    :  1,
    Monday    :  2,
    Tuesday   :  4,
    Wednesday :  8,
    Thursday  : 16,
    Friday    : 32,
    Saturday  : 64,
    /* Helpful Masks */
    Weekday   : 62,
    Weekend   : 65,
    /* eslint-enable key-spacing */
};
