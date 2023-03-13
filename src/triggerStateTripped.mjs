/* eslint-disable new-cap */
/**
 * @description Class for managing tripped trigger states.
 * @copyright 2023-2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TriggerStateTrippedModule
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 */

import _debugModule from 'debug';
import _is from 'is-it-check';

import {TRIGGER_STATES} from './triggerTypes.mjs';
import {TriggerStateBase} from './triggerStateBase.mjs';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase, no-unused-vars
const _debug = _debugModule('time_trigger_state');

/**
 * @description Base class for managing trigger states.
 * @augments TriggerStateBase
 */
export class TriggerStateTripped extends TriggerStateBase {
    /**
     * @description Constructor
     * @param {object} config - Configuration data
     * @param {string=} config.owner - Owning Trigger
     * @class
     * @private
     */
    constructor(config) {
        super(config);
    }

    /**
     * @description Read-only property for the name of the state.
     * @returns {string} - name
     * @throws {Error} - Thrown when calling the base class
     * @private
     */
    get Name() {
        return `StateTripped`;
    }

    /**
     * @description Read-only property for the name of the state.
     * @returns {TRIGGER_STATES} - state identifier
     * @throws {Error} - Thrown when calling the base class
     * @private
     */
    get State() {
        return TRIGGER_STATES.Tripped;
    }

    /**
     * @description Perform actions when entering this state.
     * @param {TriggerStateBase} oldState - State being transitioned from.
     * @returns {void}
     * @throws {TypeError} thrown if 'oldState' is not a TriggerStateBase object.
     * @private
     */
    OnEntrance(oldState) {
        super.OnEntrance(oldState);

        _debug(`TriggerStateTripped::OnEntrance: oldState=${oldState.Name} delay=${this._owner.Duration}`);
        this._owner.DoStart(this._owner.Duration);
    }

    /**
     * @description Perform actions when exiting this state.
     * @param {TriggerStateBase} newState - State being transitioned to.
     * @returns {void}
     * @throws {TypeError} thrown if 'oldState' is not a TriggerStateBase object.
     * @private
     */
    OnExit(newState) {
        super.OnExit(newState);

        // Are the trigger being re-armed?
        if (newState.State == TRIGGER_STATES.Armed) {
            // Re-Arming. Generate new timer values, in case the owner has
            // a random element or is a scheduled trigger.
            this._owner.GenerateNewTimerValues();
        }
    }

    /**
     * @description Perform actions for the transition to the next state.
     * @returns {boolean} - true if handled.
     * @private
     */
    _doNext() {
        let handled = false;
        if (_is.not.undefined(this._owner)) {
            // Determine if the Trip Limit has expired.
            if (this._owner.IsTripLimitExpired) {
                // Transition to idle
                handled = this._owner.EnterIdle();
            }
            else {
                // Transitioon to armed.
                handled = this._owner.EnterArmed();
            }
        }

        return handled;
    }

    /**
     * @description Perform actions for the abort the current state.
     * @returns {boolean} - true if handled.
     * @private
     */
    _doAbort() {
        let handled = false;
        if (_is.not.undefined(this._owner)) {
            // Transitioon to idle.
            handled = this._owner.EnterIdle();
        }

        return handled;
    }
}
