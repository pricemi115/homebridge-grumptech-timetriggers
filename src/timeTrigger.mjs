/**
 * @description Manages a time-based trigger event.
 * @copyright January 2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TimeTriggerModule
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

// Internal dependencies
import { TRIGGER_ACTIONS, TRIGGER_STATES, TriggerStateBase } from './triggerStateBase.mjs';
import { TriggerStateIdle } from './triggerStateIdle.mjs';
import { TriggerStateArmed } from './triggerStateArmed.mjs';
import { TriggerStateTripped } from './triggerStateTripped.mjs';

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
 * @description Default timeout in milli-seconds
 * @private
 */
const DEFAULT_TIMEOUT_MS = {min: 10000, max: 10000};

/**
 * @description Default time in milli-seconds for the diration of the tripped state
 * @private
 */
const DEFAULT_TRIP_DURATION_MS = {min: 250, max: 250};

/**
 * @description Enumeration of published events.
 * @readonly
 * @private
 * @enum {string}
 * @property {string} EVENT_STATE_CHANGED - Identification for the event published when the trigger state changes.
 * @property {string} EVENT_STATE_NOTIFY  - Identification for the event published when the trigger state does not change.
 */
export const TIME_TRIGGER_EVENTS = {
    /* eslint-disable key-spacing */
    EVENT_STATE_CHANGED : 'state_changed',
    EVENT_STATE_NOTIFY  : 'state_notify',
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
export const TIME_TRIGGER_STATES = {
    /* eslint-disable key-spacing */
    Inactive  : TRIGGER_STATES.Inactive,
    Armed     : TRIGGER_STATES.Armed,
    Triggered : TRIGGER_STATES.Triggered,
    /* eslint-enable key-spacing */
};

/**
 * @description Time Trigger state changed notification
 * @event module:TimeTriggerModule#event:state_changed
 * @type {object}
 * @param {string} e.uuid - Unique identifier of the trigger
 * @param {TIME_TRIGGER_STATES} e.new_state - New trigger state
 * @param {TIME_TRIGGER_STATES} e.old_state - Previous trigger state
 * @private
 */
/**
 * @description Time Trigger state notification
 * @event module:TimeTriggerModule#event:state_notify
 * @type {object}
 * @param {string} e.uuid - Unique identifier of the trigger
 * @param {TIME_TRIGGER_STATES} e.current_state - Current trigger state
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
     * @param {object=} config.timeout - Range of times for the timeout.
     * @param {number} config.timeout.min - Minimum time, in milliseconds for the timeout.
     * @param {number} config.timeout.max - Maximum time, in milliseconds for the timeout.
     * @param {object=} config.duration - Range of times for the tripped duration.
     * @param {number} config.duration.min - Minimum time, in milliseconds for the tripped duration.
     * @param {number} config.duration.max - Maximum time, in milliseconds for the tripped duration.
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @class
     * @private
     */
    constructor(config) {
        // Validate arguments
        if (_is.not.undefined(config)) {
            if (_is.not.object(config) ||
                (_is.not.undefined(config.identifier) && _is.not.string(config.identifier))) {
                throw new TypeError(`Invalid configuration.`);
            }
            if (_is.not.undefined(config.timeout)) {
                TimeTrigger._checkRange(config.timeout);
            }
            if (_is.not.undefined(config.duration)) {
                TimeTrigger._checkRange(config.duration);
            }
        }

        // Initialize the base class.
        super();

        // Create the states.
        this._idleState = new TriggerStateIdle({owner: this});
        this._armedState = new TriggerStateArmed({owner: this});
        this._trippedState = new TriggerStateTripped({owner: this});

        // Initialize at the idle state.
        this._currentState = this._idleState;

        // Callbacks bound to this object.
        this._CB__timerTripped = this._on_timerTripped.bind(this);

        this._timeoutID = INVALID_TIMEOUT_ID;

        // Use the identifier provided or generate a new one.
        if (_is.undefined(config) ||
            _is.undefined(config.identifier)) {
            // Create a unique identifier
            this._uuid = _crypto.randomUUID({disableEntropyCache: true});
        }
        else {
            // Use the identifier provided.
            this._uuid = config.identifier;
        }

        // Use the timeout provided or generate a new one.
        if (_is.undefined(config) ||
            _is.undefined(config.timeout)) {
            // Use the default
            this._timeout = DEFAULT_TIMEOUT_MS;
        }
        else {
            // Use the identifier provided.
            this._timeout = config.timeout;
        }

        this._timeout_ms = TimeTrigger._getNextValue(this._timeout);
        // Use the tripped duration provided or generate a new one.
        if (_is.undefined(config) ||
            _is.undefined(config.duration)) {
            // Use the default
            this._trippedDuration = DEFAULT_TRIP_DURATION_MS;
        }
        else {
            // Use the identifier provided.
            this._trippedDuration = config.duration;
        }
        this._trippedDuration_ms = TimeTrigger._getNextValue(this._trippedDuration);
    }

    /**
     * @description Read-only property accessor for the trigger state
     * @returns {TIME_TRIGGER_STATES} - Trigger state.
     */
    get State() {
        return this._currentState.State;
    }

    /**
     * @description Read-only property accessor for the trigger identifier
     * @returns {string} - Trigger identifier.
     */
    get Identifier() {
        return this._uuid;
    }

    /**
     * @description Read property accessor for the timeout of the trigger
     * @returns {number} - Timeout in milliseconds.
     */
    get Timeout() {
        return this._timeout_ms;
    }

    /**
     * @description Read property accessor for the tripped duration of the trigger
     * @returns {number} - Duration in milliseconds.
     */
    get Duration() {
        return this._trippedDuration_ms
    }

    /**
     * @description API to start/restart the timer.
     * @returns {void}
     */
    Start() {
        // Stop the trigger to bring us to the Idle State.
        if (!(this._currentState instanceof TriggerStateIdle)) {
            this.Stop();
        }

        // Manage the state
        this._currentState.Evaluate(TRIGGER_ACTIONS.Next);
    }

    /**
     * @description API to stop the timer.
     * @returns {void}
     */
    Stop() {
        // Abort the current state.
        this._currentState.Evaluate(TRIGGER_ACTIONS.Abort);
    }

    /**
     * @description Enter Idle State
     * @returns {void}
     */
    EnterIdle() {
        // Stop the timer.
        this._doStop();

        // Generate new timer values.
        this._timeout_ms = TimeTrigger._getNextValue(this._timeout);
        this._trippedDuration_ms = TimeTrigger._getNextValue(this._trippedDuration);

        // Manage the state.
        this._doStateChange(this._idleState);
    }

    /**
     * @description Enter Armed State
     * @returns {void}
     */
    EnterArmed() {
        // Manage the state.
        this._doStateChange(this._armedState);

        // Start the timer with the timeout period
        this._doStart(this._timeout_ms);
    }

    /**
     * @description Enter Tripped State
     * @returns {void}
     */
    EnterTripped() {
        // Manage the state.
        this._doStateChange(this._trippedState);

        // Start the timer for the tripped duration.
        this._doStart(this._trippedDuration_ms);
    }

    /**
     * @description Helper to start the trigger timer.
     * @param {number} timeout - Timeout period, in milliseconds
     * @returns {void}
     * @throws {TypeError} - thrown if timeout is not a number
     * @throws {RangeError} - thrown if the timeout is not positive
     * @private
     */
    _doStart(timeout) {
        if (_is.not.number(timeout)) {
            throw new TypeError(`'timeout' is not a number`);
        }
        if (_is.not.positive(timeout)) {
            throw new RangeError(`'timeout' is not positive`);
        }

        //Sanity. Stop, if needed.
        this._doStop();

        // Set the timer.
        this._timeoutID = setTimeout(this._CB__timerTripped, timeout);
    }

    /**
     * @description Helper to stop the trigger timer.
     * @returns {void}
     * @private
     */
    _doStop() {
        // Clear the timer.
        if (this._timeoutID !== INVALID_TIMEOUT_ID) {
            clearTimeout(this._timeoutID);
            this._timeoutID = INVALID_TIMEOUT_ID;
        }        
    }

    /**
     * @description Event handler for the timer tripping
     * @returns {void}
     * @private
     */
    _on_timerTripped() {
        // Reset the timer id
        this._timeoutID = INVALID_TIMEOUT_ID;

        // Manage the state
        this._currentState.Evaluate(TRIGGER_ACTIONS.Next);
    }

    /**
     * @description Manage state changes.
     * @param {TriggerStateBase} state - New state
     * @returns {void}
     * @fires module:TimeTriggerModule#event:state_changed
     * @fires module:TimeTriggerModule#event:state_notify
     * @throws {TypeError} - Thrown if 'state' is not a TRIGGER_STATES value.
     * @private
     */
    _doStateChange(state) {
        // Validate the arguments
        if (!(state instanceof TriggerStateBase)) {
            throw new TypeError(`Invalid State: ${state}`);
        }

        // Check for a change in state
        if (state.State !== this._currentState.State) {
            // Decouple the state change.
            setImmediate(() => {
                // Cache the old state.
                const oldState = this._currentState;
                // Exit the current state, providing it the new state.
                this._currentState.OnExit(state);
                // Update the state.
                this._currentState = state;
                // Enter the new state.
                this._currentState.OnEntrance(oldState);

                // Raise the state changed event.
                this.emit(TIME_TRIGGER_EVENTS.EVENT_STATE_CHANGED, {uuid: this.Identifier, old_state: oldState.State, new_state: this.State});
            });
        }
        else {
            // No state change necessary. 
            // Raise the state notify event, as a convenience to the client.
            this.emit(TIME_TRIGGER_EVENTS.EVENT_STATE_NOTIFY, {uuid: this.Identifier, current_state: this.State});
        }
    }

    /**
     * @description Helper to validate range configuration parameters,
     * @param {object} range - Configuration parameter
     * @param {number} range.mimumum - Minimum value
     * @param {number} range.maximum - Maximum value
     * @returns {void}
     * @throws {TypeError} - Thrown if the types are not as expected.
     * @throws {RangeError} - Thrown if wither the max or min are negative or if the max is less than the min.
     * @private
     */    
    static _checkRange(range) {
        if (_is.not.undefined(range)) {
            if (_is.not.object(range) ||
                _is.not.number(range.min) ||
                _is.not.number(range.max)) {
                throw new TypeError(`range is invalid.`);
            }
            if (_is.negative(range.min) ||
                _is.negative(range.max) ||
                _is.under(range.max, range.min)) {
                throw new RangeError(`range is invalid.`);
            }
        }
    }

    static _getNextValue(range) {
        // Validate
        TimeTrigger._checkRange(range);

        const nextVal = (Math.floor(Math.random()) * (range.max - range.min)) + range.min;

        return nextVal;
    }
}
