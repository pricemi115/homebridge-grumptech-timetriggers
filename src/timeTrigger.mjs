/* eslint-disable new-cap */
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
import {TRIGGER_STATES, TRIGGER_EVENTS} from './triggerTypes.mjs';
import {TRIGGER_ACTIONS, TriggerStateBase} from './triggerStateBase.mjs';
import {TriggerStateIdle} from './triggerStateIdle.mjs';
import {TriggerStateArmed} from './triggerStateArmed.mjs';
import {TriggerStateTripped} from './triggerStateTripped.mjs';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase, no-unused-vars
const _debug_proces = _debugModule('time_trigger');

/**
 * @description Flag value for an invalid timeout
 * @private
 */
const INVALID_TIMEOUT_ID = -1;

/**
 * @description Default timeout, in milliseconds
 * @private
 */
const DEFAULT_TIMEOUT_MS = {nominal: 10000, tolerance: 0};

/**
 * @description Default, in milli-seconds, for the duration of the tripped state
 * @private
 */
const DEFAULT_TRIP_DURATION_MS = {nominal: 250, tolerance: 0};

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
 * @description Trigger for periodic events.
 * @augments EventEmitter
 */
export class TimeTrigger extends EventEmitter {
    /**
     * @description Constructor
     * @param {object} config - Configuration data
     * @param {string} config.signature - Identifier intended to be used for persistence, but cannot be guaranteed to be unique.
     * @param {object=} config.timeout - Configuration of the timeout interval.
     * @param {number} config.timeout.nominal - Nominal time, in milliseconds, for the timeout.
     * @param {number} config.timeout.tolerance - Tolerance, in milliseconds, for the timeout.
     * @param {object=} config.duration - Configuration of the tripped duration.
     * @param {number} config.duration.nominal - Nominal time, in milliseconds, for the tripped duration.
     * @param {number} config.duration.tolerance - Tolerance, in milliseconds, for the tripped duration.
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @class
     * @private
     */
    constructor(config) {
        // Validate arguments
        if (_is.not.undefined(config)) {
            if (_is.not.object(config)) {
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

        // Generate a new identifier
        this._uuid = _crypto.randomUUID({disableEntropyCache: true});

        // Get the identifier from the configuration.
        if (_is.existy(config) &&
            _is.string(config.signature) &&
            (config.signature.length > 0)) {
            this._signature = config.signature;
            this._name = config.signature;
        }
        else {
            // Identifier was either not provided or is invalid.
            const hash = _crypto.createHash('sha256');
            if (_is.existy(config)) {
                hash.update(JSON.stringify(config));
            }
            else {
                hash.update(`No config`);
            }
            this._signature = hash.digest('hex').toLowerCase();
            this._name = this._signature.slice(0, 6);
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

        this._timeout_ms = -1;
        this._trippedDuration_ms = -1;

        // Force a decoupled transition into the Idle State.
        this._initializing = true;
        setImmediate(() => {
            this.EnterIdle();
        });
    }

    /**
     * @description Read-only property accessor for the trigger state
     * @returns {TRIGGER_STATES} - Trigger state.
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
     * @description Read-only property accessor for the trigger signature
     * @returns {string} - Trigger signature.
     */
    get Signature() {
        return this._signature;
    }

    /**
     * @description Read-only property accessor for the trigger name
     * @returns {string} - Trigger name.
     */
    get Name() {
        return this._name;
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
        return this._trippedDuration_ms;
    }

    /**
     * @description API to start/restart the timer.
     * @returns {void}
     */
    Start() {
        // Decouple the request if we are still initializing.
        if (this._initializing) {
            setImmediate(() => {
                this.Start();
            });
        }
        else {
            // Stop the trigger to bring us to the Idle State.
            if (!(this._currentState instanceof TriggerStateIdle)) {
                this.Stop();
            }

            // Manage the state
            this._currentState.Evaluate(TRIGGER_ACTIONS.Next);
        }
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

        // Generate new timer values, in case there is a random element.
        this._generateNewTimerValues();

        // Manage the state.
        this._doStateChange(this._idleState);

        // Clear the initializing flag.
        this._initializing = false;
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
     * @description Generates new timeout values for the timer.
     * @returns {void}
     */
    _generateNewTimerValues() {
        this._timeout_ms = TimeTrigger._getNextValue(this._timeout);
        this._trippedDuration_ms = TimeTrigger._getNextValue(this._trippedDuration);
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
            throw new RangeError(`'timeout' is not positive: ${timeout}`);
        }

        // Sanity. Stop, if needed.
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
                this.emit(TRIGGER_EVENTS.EVENT_STATE_CHANGED, {uuid: this.Identifier, old_state: oldState.State, new_state: this.State});
            });
        }
        else {
            // No state change necessary.
            // Raise the state notify event, as a convenience to the client.
            this.emit(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, {uuid: this.Identifier, current_state: this.State});
        }
    }

    /**
     * @description Helper to validate range configuration parameters,
     * @param {object} range - range object to be validated.
     * @param {number} range.nominal - Nominal value
     * @param {number} range.tolerance - Tolerance value
     * @returns {void}
     * @throws {TypeError} - Thrown if the types are not as expected.
     * @throws {RangeError} - Thrown if either the nominal or tolerance are negative.
     * @private
     */
    static _checkRange(range) {
        if (_is.not.undefined(range)) {
            if (_is.not.object(range) ||
                _is.not.number(range.nominal) ||
                _is.not.number(range.tolerance)) {
                throw new TypeError(`range is invalid.`);
            }
            if (_is.negative(range.nominal) ||
                _is.negative(range.tolerance)) {
                throw new RangeError(`range is invalid.`);
            }
        }
    }

    /**
     * @description Helper to get the next value from range specified
     * @param {object} range - Configuration parameter
     * @param {number} range.nominal - Nominal value
     * @param {number} range.tolerance - Tolerance value
     * @returns {number} - next value from the range
     * @private
     */
    static _getNextValue(range) {
        // Validate
        TimeTrigger._checkRange(range);

        // Compute the absolute minimum possible, capping at 0.
        const minimum = range.nominal - range.tolerance;

        // Compute the absolute maximum possible.
        const maximum = range.nominal + range.tolerance;

        // Compute the next value from the range.
        let nextVal = (Math.floor(Math.random()) * (maximum - minimum)) + minimum;
        // Cap at 0
        if (_is.negative(nextVal)) {
            nextVal = 0;
        }

        return nextVal;
    }
}
