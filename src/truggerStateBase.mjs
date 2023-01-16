/**
 * @description Base class for managing trigger states.
 * @copyright January 2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TriggerStateBaseModule
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 */

import _debugModule from 'debug';
import _is from 'is-it-check';

import TimeTrigger from './timeTrigger.mjs';

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
     * @param {string=} config.owner - Owning Trigger
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
            _is.not.sameType(config.owner, TimeTrigger)) {
            throw new TypeError(`Invalid configuration.`);
        }

       // Ensure we are not attempting to instanciate the base class.
       if (this.constructor === TriggerStateBase) {
            // Prevent creation of the base object.
            throw new Error(`Instantiating base class.`);
        }

        this._owner = config.owner;
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
            break;

            case TRIGGER_ACTIONS.Abort: {
                handled = this._doNext();
            }
            break;

            default: {
                handled = false;
            }
            break;
        }

        return handled;
    }

    /**
     * @description Perform actions when entering this state.
     * @returns {void}
     * @private
     */
    OnEntrance() {
        _debug(`TriggerStateBase::OnEntrance() called.`);
    }

    /**
     * @description Perform actions when exiting this state.
     * @returns {void}
     * @private
     */
    OnExit() {
        _debug(`TriggerStateBase::OnExit() called.`);
    }

    /**
     * @description Perform actions for the transition to the next state.
     * @returns {boolean} - true if handled
     * @private
     */
    _doNext() {
        _debug(`TriggerStateBase::_doNext() called.`);
        return false;
    }

    /**
     * @description Perform actions for the abort the current state.
     * @returns {boolean} - true if handled
     * @private
     */
    _doAbort() {
        _debug(`TriggerStateBase::_doAbort() called.`);
        return false;
    }

}
