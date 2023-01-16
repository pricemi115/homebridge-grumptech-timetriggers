/**
 * @description Class for managing idle trigger states.
 * @copyright January 2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module TriggerStateIdleModule
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 */

import _debugModule from 'debug';
import _is from 'is-it-check';

import { TimeTrigger } from './timeTrigger.mjs';
import { TriggerStateBase } from './truggerStateBase.mjs';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase
const _debug = _debugModule('time_trigger_state');

/**
 * @description Base class for managing trigger states.
 * @augments TriggerStateBase
 */
export class TriggerStateIdle extends TriggerStateBase {
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
     * @description Perform actions for the transition to the next state.
     * @returns {boolean} - true if handled.
     * @private
     */
    _doNext() {
        let handled = false;
        if (_is.not.undefined(this._owner)) {
            // Transitioon to armed.
            handled = this._owner.EnterArmed();
        }
    }

    /**
     * @description Perform actions for the abort the current state.
     * @returns {boolean} - true if handled.
     * @private
     */
    _doAbort() {
        // There is nothing to do. Aborting idle, remains idle.
        return true;
    }

}
