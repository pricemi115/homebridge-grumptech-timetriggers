/**
 * @description Base class for managing trigger states.
 * @copyright 2023-2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TriggerStateBaseModule
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 */

import _debugModule from 'debug';
import _is from 'is-it-check';

import {TRIGGER_STATES} from './triggerTypes.mjs';
import {TimeTrigger} from './timeTrigger.mjs';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase
const _debug = _debugModule('time_trigger_state');

/**
 * @description Enumeration of the trigger actoions
 * @private
 * @readonly
 * @enum {string}
 * @property {string} Next- Perform next action
 * @property {string} Abort - Perform abort action
 */
export const TRIGGER_ACTIONS = {
    /* eslint-disable key-spacing */
    Next  : 'next',
    Abort : 'abort',
    /* eslint-enable key-spacing */
};

/**
 * @description Base class for managing trigger states.
 */
export class TriggerStateBase {
    /**
     * @description Constructor
     * @param {object} config - Configuration data
     * @param {TimeTrigger} config.owner - Owning Trigger
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @throws {Error} - Thrown if instantiating the base class.
     * @class
     * @private
     */
    constructor(config) {
        // Validate arguments
        if (_is.undefined(config) ||
            _is.not.object(config) ||
            _is.undefined(config.owner) ||
            !(config.owner instanceof TimeTrigger)) {
            throw new TypeError(`Invalid configuration.`);
        }

        // Ensure we are not attempting to instanciate the base class.
        if (this.constructor === TriggerStateBase) {
            // Prevent creation of the base object.
            throw new Error(`Instantiating base class.`);
        }

        this._owner = config.owner;
    }

    // eslint-disable-next-line jsdoc/require-returns-check
    /**
     * @description Read-only property for the name of the state.
     * @returns {string} - name
     * @throws {Error} - Thrown when calling the base class
     * @private
     */
    get Name() {
        throw new Error(`Abstract Property: Name`);
    }

    // eslint-disable-next-line jsdoc/require-returns-check
    /**
     * @description Read-only property for the id of the state.
     * @returns {TRIGGER_STATES} - state identifier
     * @throws {Error} - Thrown when calling the base class
     * @private
     */
    get State() {
        throw new Error(`Abstract Property: State`);
    }

    // eslint-disable-next-line jsdoc/require-returns-check
    /**
     * @description Read-only property for state ids for valid transitions.
     * @returns {TRIGGER_STATES[]} - array of state ids
     * @throws {Error} - Thrown when calling the base class
     * @private
     */
    get ValidTransitionStates() {
        throw new Error(`Abstract Property: ValidTransitionStates`);
    }

    /**
     * @description Evaluate the trigger action
     * @param {TRIGGER_ACTIONS} action - Action to evaluate for the current state.
     * @returns {boolean} - true if handled.
     * @throws {TypeError} - Thrown if 'action' is invalid.
     * @private
     */
    Evaluate(action) {
        // Validate arguments.
        if (_is.not.string(action) ||
            _is.under(action.length, 1) ||
            (Object.values(TRIGGER_ACTIONS).indexOf(action) < 0)) {
            throw new TypeError(`'action' is invalid. ${action}`);
        }

        let handled = false;
        switch (action) {
            case TRIGGER_ACTIONS.Next: {
                handled = this._doNext();
            }
            // eslint-disable-next-line indent
            break;

            case TRIGGER_ACTIONS.Abort: {
                handled = this._doAbort();
            }
            // eslint-disable-next-line indent
            break;

            default: {
                handled = false;
            }
            // eslint-disable-next-line indent
            break;
        }
        _debug(`State Eval: ${this.Name} evaluating action:${action} result:${handled}`);

        return handled;
    }

    /**
     * @description Perform actions when entering this state.
     * @param {TriggerStateBase} oldState - State being transitioned from.
     * @returns {void}
     * @throws {TypeError} thrown if 'oldState' is not a TriggerStateBase object.
     * @private
     */
    OnEntrance(oldState) {
        if (!(oldState instanceof TriggerStateBase)) {
            throw new TypeError(`${this.Name}::OnEntrance(). oldState is invalid.`);
        }

        _debug(`${this.Name}::OnEntrance() called. Transitioning from state ${oldState.Name}`);
    }

    /**
     * @description Perform actions when exiting this state.
     * @param {TriggerStateBase} newState - State being transitioned to.
     * @returns {void}
     * @throws {TypeError} thrown if 'oldState' is not a TriggerStateBase object.
     * @private
     */
    OnExit(newState) {
        if (!(newState instanceof TriggerStateBase)) {
            throw new TypeError(`${this.Name}::OnEntrance(). newState is invalid.`);
        }

        // Validate that we are transitioning to a valid state.
        if (!this.ValidTransitionStates.includes(newState.State)) {
            // Invalid transition.
            throw new Error(`Invalid transition from ${this.Name} to ${newState.Name}`);
        }

        _debug(`${this.Name}::OnExit() called. Transitioning to state ${newState.Name}`);
    }

    /**
     * @description Perform actions for the transition to the next state.
     * @returns {boolean} - true if handled
     * @private
     */
    _doNext() {
        _debug(`${this.Name}::_doNext() called.`);
        return false;
    }

    /**
     * @description Perform actions for the abort the current state.
     * @returns {boolean} - true if handled
     * @private
     */
    _doAbort() {
        _debug(`${this.Name}::_doAbort() called.`);
        return false;
    }
}
