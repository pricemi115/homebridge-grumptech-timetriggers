/**
 * @description Manages a time-based trigger event.
 * @copyright January 2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module VolumeInterrogatorBaseModule
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires events
 * @see {@link https://nodejs.org/dist/latest-v16.x/docs/api/events.html#events}
 * @requires crypto
 * @see {@link https://nodejs.org/dist/latest-v16.x/docs/api/crypto.html#crypto}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 */

// External dependencies and imports.
import EventEmitter from 'events';
import * as _crypto from 'crypto';
import _debugModule from 'debug';
import _is from 'is-it-check';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase
const _debug_proces = _debugModule('time_trigger');

/**
 * @description Flag value for an invalid timeout
 * @private
 */
const INVALID_TIMEOUT_ID = -1;

/**
 * @description Flag value for an invalid timeout
 * @private
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * @description Enumeration of published events.
 * @readonly
 * @private
 * @enum {string}
 * @property {string} EVENT_STATE_CHANGED - Identification for the event published when the trigger state changes.
 */
const TIME_TRIGGER_EVENTS = {
    /* eslint-disable key-spacing */
    EVENT_STATE_CHANGED   : 'state_changed',
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
 * @description Time Trigger state changed notification
 * @event module:TimeTriggerModule#event:state_changed
 * @type {object}
 * @param {string} e.uuid - Unique identifier of the trigger
 * @param {TRIGGER_STATES} e.new_state - New trigger state
 * @param {TRIGGER_STATES} e.old_state - Previous trigger state
 * @private
 */
/**
 * @description Base class for volume interrogation (operating system agnostic).
 * @augments EventEmitter
 */
export class TimeTrigger extends EventEmitter {
    /**
     * @description Constructor
     * @param {object} config - Configuration data
     * @param {string=} config.identifier - Identifier
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @class
     * @private
     */
    constructor(config) {
        // Validate arguments
        if (_is.not.object(config) ||
            (_is.not.undefined(config.identifier) && _is.not.string(config.identifier))) {
            throw new TypeError(`Invalid configuration.`);
        }

        // Callbacks bound to this object.
        this._CB__timerTripped     = this._on_timerTripped.bind(this);

        this._state = TRIGGER_STATES.Inactive;
        this._timeout_ms = DEFAULT_TIMEOUT_MS;
        this._timeoutID = INVALID_TIMEOUT_ID;

        // Use the identifier provided or set a new one.
        if (_is.undefined(config.identifier)) {
            // Create an identifier based on the time and random numbers.
            const hash = _crypto.createHash('sha256');
            // Get the current time and update the hash.
            const now = Date.now();
            hash.update(now);
            // Get some random numbers and update the hash.
            const randNumbers = new Uint8Array(64);
            _crypto.webcrypto.getRandomValues(randNumbers);
            for (const rand in randNumbers) {
                hash.update(now);
            }
            // Set the unique identifier.
            this._uuid = hash.digest('hex');
            console.log(`UUID: ${this._uuid}`);
        }
        else {
            // Use the identifier provided.
            this._uuid = config.identifier;
        }
    }

    /**
     * @description Read-only property accessor for the trigger state
     * @returns {TRIGGER_STATES} - Trigger state.
     */
    get State() {
        return this._state;
    }

    /**
     * @description Read-only property accessor for the trigger identifier
     * @returns {string} - Trigger identifier.
     */
    get Identifier() {
        return this._uuid;
    }   

    /**
     * @description API to start/restart the timer.
     * @returns {void}
     */
    Start() {
        // Clear the timer if active.
        this.Stop();

        // Set the timer.
        this._timeoutID = setTimeout(this._CB__timerTripped, this._timeout_ms);

        // Manage the state
        _doStateChange(TRIGGER_STATES.Armed);
    }

    /**
     * @description API to stop the timer.
     * @returns {void}
     */
    Stop() {
         // Clear the timer.
         if (this._timeoutID !== INVALID_TIMEOUT_ID) {
            clearTimeout(this._timeoutID);
            this._timeoutID = INVALID_TIMEOUT_ID;

            // Manage the state
            _doStateChange(TRIGGER_STATES.Inactive);
        }       
    }

    /**
     * @description Event handler for the timer tripping
     * @returns {void}
     * @private
     */
    _on_timerTripped() {
        // Manage the state
        _doStateChange(TRIGGER_STATES.Triggered);

        // Determine if the trigger should be reset.
        // TODO
    }

    /**
     * @description Manage state changes.
     * @param {TRIGGER_STATES} state - New state
     * @returns {void}
     * @fires module:TimeTriggerModule#event:state_changed
     * @throws {TypeError} - Thrown if 'state' is not a TRIGGER_STATES value.
     * @private
     */
    _doStateChange(state) {
        // Validate the arguments
        if (_is.not.number(state) ||
            (Object.values(TRIGGER_STATES).indexOf(state) < 0)) {
            throw new TypeError(`Invalid State: ${state}`);
        }

        // Check for a change in state
        if (state !== this._state) {
            // Update the state
            const oldState = this.State;
            this._state = state;

            // Raise the state changed event.
            this.emit(TIME_TRIGGER_EVENTS.EVENT_STATE_CHANGED, {uuid: this.Identifier, old_state: oldState, new_state: this.State});
        }
    }
}
