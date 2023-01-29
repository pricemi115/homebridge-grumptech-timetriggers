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