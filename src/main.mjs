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

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the
 * "homebridge" module (or the "hap-nodejs" module).
 * The import block below may seem like we do exactly that, but actually those imports are only used
 * for types and interfaces and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in
 * the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement
 * anywhere in the code.
 *
 * The contents of the import statement below MUST ONLY be used for type annotation or accessing
 * things like CONST ENUMS, which is a special case as they get replaced by the actual value and do
 * not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result
 * in a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to
 * find the module or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside
 * the `hap` property of the api object, which can be acquired for example in the initializer
 * function. This reference can be stored and used to access all exported varia bles and classes
 * from HAP-NodeJS.
 */
/*
import {
    API,
    APIEvent,
    CharacteristicEventTypes,
    CharacteristicSetCallback,
    CharacteristicValue,
    DynamicPlatformPlugin,
    HAP,
    Logging,
    PlatformAccessory,
    PlatformAccessoryEvent,
    PlatformConfig,
    Service,
  } from "homebridge";
*/

// External dependencies and imports.
import _debugModule from 'debug';
import _is from 'is-it-check';

// Internal dependency and imports
import {TimeTrigger} from './timeTrigger.mjs';
import {ScheduledTrigger} from './scheduledTrigger.mjs';
import {TRIGGER_STATES, TRIGGER_EVENTS, TRIGGER_DAYS, TRIGGER_TYPES} from './triggerTypes.mjs';

// Internal Constants
// History:
//          v1: Initial release
/**
 * @description Version history of the plugin.
 * @private
 */
const ACCESSORY_VERSION = 1;

/**
 * @private
 * @description Debugging function pointer for runtime related diagnostics.
 */
const _debug = _debugModule('homebridge');

/**
 * @description Package Information
 */
const _PackageInfo = {CONFIG_INFO: PLACEHOLDER_CONFIG_INFO, PLUGIN_VER: 'PLACEHOLDER_VERSION'};

/**
 * @description Platform accessory reference
 * @private
 */
let _PlatformAccessory;
/**
 * @description Reference to the NodeJS Homekit Applicaiton Platform.
 * @private
 */
let _hap;

/**
 * @description Service identification information
 * @readonly
 * @private
 * @enum {object}
 * @property {object} CONTROL - Service information for the control switch for each trigger.
 * @property {string} CONTROL.uuid - Unique identifier for the control switch.
 * @property {string} CONTROL.name - Name of the control switch.
 * @property {string} CONTROL.udst - User defined subtype for the control switch.
 * @property {object} MOTION - Service information for the motion status for each trigger.
 * @property {string} MOTION.uuid - Unique identifier for the motion status.
 * @property {string} MOTION.name - Name of the motion status.
 * @property {string} MOTION.udst - User defined subtype for the motion status.
 */
const SERVICE_INFO = {
    /* eslint-disable key-spacing, max-len */
    CONTROL : {uuid:`4A11F55C-B51E-4E17-9170-7295B0731F67`, name:`Trigger Control`, udst:`TriggerControl`},
    MOTION  : {uuid:`26BCECB8-5477-4198-83F0-768F79CC2951`, name:`Motion Status`,   udst:`MotionStatus`},
    /* eslint-enable key-spacing, max-len */
};

/**
 * @description Homebridge platform for managing the Triggers
 * @private
 */
class TimeTriggerPlatform {
    /**
     * @description Constructor
     * @param {object} log - Regerence to the log for logging in the Homebridge Context
     * @param {object} config - Reference to the platform configuration (from config.json)
     * @param {object} api - Reference to the Homebridge API
     * @throws {TypeError} - thrown if the configuration is invalid.
     */
    constructor(log, config, api) {
        /* Cache the arguments. */
        this._log     = log;
        this._config  = config;
        this._api     = api;

        /* My local data */
        this._name = this._config.name;

        /* Bind Handlers */
        this._bindDoInitialization          = this._doInitialization.bind(this);
        this._bindDestructorNormal          = this._destructor.bind(this, {cleanup: true});
        this._bindDestructorAbnormal        = this._destructor.bind(this, {exit: true});
        this._CB_TriggerStateChanged        = this._handleTriggerStateChanged.bind(this);
        this._CB_TriggerStateNotify         = this._handleTriggerStateNotify.bind(this);

        /* Log our creation */
        this._log('Creating TimeTriggerPlatform');

        /* Create an empty map for our accessories and time triggers */
        this._triggers = new Map();

        // Create triggers based upon the configuration.
        if (_is.not.undefined(config) &&
            _is.not.undefined(config.settings) && _is.not.undefined(config.settings.triggers) &&
            _is.array(config.settings.triggers)) {
            config.settings.triggers.forEach((triggerSettings, index) => {
                // Get the identifier.
                let identifier = null;
                if (_is.not.undefined(triggerSettings.trigger_identifier) && _is.string(triggerSettings.trigger_identifier)) {
                    identifier = triggerSettings.trigger_identifier;
                }
                else {
                    throw new TypeError(`Configuration is invalid. Trigger Identifier.`);
                }

                // Determine if this trigger identifier is already in use.
                let identifierUsed = false;
                this._triggers.forEach((item, index) => {
                    if (_is.existy(item.trigger) &&
                        _is.equal(item.trigger.Signature, identifier)) {
                        identifierUsed = true;
                    }
                });

                // Is the identifier free?
                if (!identifierUsed) {
                    // Determine if the `random` flag is set.
                    let isRandom = false;
                    if (_is.not.undefined(triggerSettings.trigger_random) && _is.boolean(triggerSettings.trigger_random)) {
                        isRandom = triggerSettings.trigger_random;
                    }
                    else {
                        throw new TypeError(`Configuration is invalid. Trigger Random.`);
                    }

                    // Get the trigger type.
                    let triggerType = -1;
                    if (_is.not.undefined(triggerSettings.trigger_type) && _is.number(triggerSettings.trigger_type) &&
                        (Object.values(TRIGGER_TYPES).indexOf(triggerSettings.trigger_type) >= 0)) {
                        triggerType = triggerSettings.trigger_type;
                    }
                    else {
                        throw new TypeError(`Configuration is invalid. Trigger Type.`);
                    }

                    // Build the trigger configuration.
                    const triggerConfig = {signature: identifier};

                    // Common trigger configuration data.
                    triggerConfig.duration = {};
                    if (_is.not.undefined(triggerSettings.duration) && _is.object(triggerSettings.duration)) {
                        // Duration - Minimum
                        if (_is.not.undefined(triggerSettings.duration.min) && _is.number(triggerSettings.duration.min) &&
                            _is.positive(triggerSettings.duration.min) &&_is.above(triggerSettings.duration.min, 249)) {
                            // Set the minimum
                            triggerConfig.duration.min = triggerSettings.duration.min;
                            // Default the maximum to the minimum
                            triggerConfig.duration.max = triggerSettings.duration.min;
                        }
                        else {
                            throw new TypeError(`Configuration is invalid. Duration - min.`);
                        }
                        // Duration - Maximum (only valid if random is enabled.)
                        if (isRandom) {
                            if (_is.not.undefined(triggerSettings.duration.max) && _is.number(triggerSettings.duration.max) &&
                                _is.positive(triggerSettings.duration.max) && _is.above(triggerSettings.duration.max, (triggerSettings.duration.min - 1))) {
                                // Update the maximum
                                triggerConfig.duration.max = triggerSettings.duration.max;
                            }
                            else  {
                                throw new TypeError(`Configuration is invalid. Duration - max.`);
                            }
                        }
                    }
                    else {
                        throw new TypeError(`Configuration is invalid. Timeout.`);
                    }
                    // Trigger type specific configuration.
                    switch (triggerType) {
                        case TRIGGER_TYPES.MultiTrip: {
                            // Extract the appropriate configuration.
                            triggerConfig.timeout = {};
                            if (_is.not.undefined(triggerSettings.timeout) && _is.object(triggerSettings.timeout)) {
                                // Timeout - Minimum
                                if (_is.not.undefined(triggerSettings.timeout.min) && _is.number(triggerSettings.timeout.min) &&
                                    _is.positive(triggerSettings.timeout.min)) {
                                    // Set the minimum
                                    triggerConfig.timeout.min = triggerSettings.timeout.min;
                                    // Default the maximum to the minimum
                                    triggerConfig.timeout.max = triggerSettings.timeout.min;
                                }
                                else {
                                    throw new TypeError(`Configuration is invalid. Timeout - min.`);
                                }
                                // Timeout - Maximum (only valid if random is enabled.)
                                if (isRandom) {
                                    if (_is.not.undefined(triggerSettings.timeout.max) && _is.number(triggerSettings.timeout.max) &&
                                        _is.positive(triggerSettings.timeout.max) && _is.above(triggerSettings.timeout.max, (triggerSettings.timeout.min - 1))) {
                                        // Update the maximum
                                        triggerConfig.timeout.max = triggerSettings.timeout.max;
                                    }
                                    else  {
                                        throw new TypeError(`Configuration is invalid. Timeout - max.`);
                                    }
                                }
                            }
                            else {
                                throw new TypeError(`Configuration is invalid. Timeout.`);
                            }
                        }
                        // eslint-disable-next-line indent
                        break;

                        case TRIGGER_TYPES.Daily: {
                            // Extract the appropriate configuration.
                            // Days that the trigger should trip.
                            if (_is.not.undefined(triggerSettings.days) && _is.number(triggerSettings.days) &&
                                (Object.values(TRIGGER_DAYS).indexOf(triggerSettings.days) >= 0)) {
                                triggerConfig.days = triggerSettings.days;
                            }
                            else {
                                throw new TypeError(`Configuration is invalid. Days.`);
                            }
                            // Trigger time window
                            triggerConfig.time = {};
                            if (_is.not.undefined(triggerSettings.time) && _is.object(triggerSettings.time)) {
                                // Time Window - Minimum
                                triggerConfig.time.min = {};
                                triggerConfig.time.max = {};
                                if (_is.not.undefined(triggerSettings.time.min) && _is.object(triggerSettings.time.min)) {
                                    // Hour
                                    if (_is.not.undefined(triggerSettings.time.min.hour) && _is.number(triggerSettings.time.min.hour) &&
                                        _is.within(triggerSettings.timeout.min.hour, -1, 24)) {
                                        // Set the minimum
                                        triggerConfig.time.min.hour = triggerSettings.timeout.min.hour;
                                        // Default the maximum to the minimum
                                        triggerConfig.time.max.hour = triggerSettings.timeout.min.hour;
                                    }
                                    else {
                                        throw new TypeError(`Configuration is invalid. Time Window(min)-hour.`);
                                    }
                                    // Minute
                                    if (_is.not.undefined(triggerSettings.time.min.minute) && _is.number(triggerSettings.time.min.minute) &&
                                        _is.within(triggerSettings.timeout.min.minute, -1, 60)) {
                                        // Set the minimum
                                        triggerConfig.time.min.minute = triggerSettings.timeout.min.minute;
                                        // Default the maximum to the minimum
                                        triggerConfig.time.max.minute = triggerSettings.timeout.min.minute;
                                    }
                                    else {
                                        throw new TypeError(`Configuration is invalid. Time Window(min)-minute.`);
                                    }
                                }
                                else {
                                    throw new TypeError(`Configuration is invalid. Time Window - min.`);
                                }
                                // Time Window - Maximum (only valid if random is enabled.)
                                if (isRandom) {
                                    if (_is.not.undefined(triggerSettings.time.max) && _is.object(triggerSettings.time.max)) {
                                        // Hour
                                        if (_is.not.undefined(triggerSettings.time.max.hour) && _is.number(triggerSettings.time.max.hour) &&
                                            _is.within(triggerSettings.timeout.max.hour, -1, 24)) {
                                            // Update the maximum
                                            triggerConfig.time.max.hour = triggerSettings.timeout.max.hour;
                                        }
                                        else {
                                            throw new TypeError(`Configuration is invalid. Time Window(max)-hour.`);
                                        }
                                        // Minute
                                        if (_is.not.undefined(triggerSettings.time.max.minute) && _is.number(triggerSettings.time.max.minute) &&
                                            _is.within(triggerSettings.timeout.max.minute, -1, 60)) {
                                            // Update the minimum
                                            triggerConfig.time.max.minute = triggerSettings.timeout.max.minute;
                                        }
                                        else {
                                            throw new TypeError(`Configuration is invalid. Time Window(max)-minute.`);
                                        }
                                    }
                                    else {
                                        throw new TypeError(`Configuration is invalid. Time Window - max.`);
                                    }
                                }
                            }
                            else {
                                throw new TypeError(`Configuration is invalid. Time window.`);
                            }
                        }
                        // eslint-disable-next-line indent
                        break;

                        default: {
                            throw new TypeError(`Configuration is invalid. Unknown TriggerType. ${triggerSettings.trigger_type}`);
                        }
                        // eslint-disable-next-line indent
                        break;
                    }

                    // Construct the appropriate trigger with the configuration.
                    let trigger = null;
                    switch (triggerType) {
                        case TRIGGER_TYPES.MultiTrip: {
                            trigger = new TimeTrigger(triggerConfig);
                        }
                        // eslint-disable-next-line indent
                        break;

                        case TRIGGER_TYPES.Daily: {
                            trigger = new ScheduledTrigger(triggerConfig);
                        }
                        // eslint-disable-next-line indent
                        break;

                        default: {
                            throw new TypeError(`Configuration is invalid. Unknown TriggerType. ${triggerSettings.trigger_type}`);
                        }
                        // eslint-disable-next-line indent
                        break;
                    }
                    // Append the trigget to our map, keyed off the unique identification.
                    this._triggers.set(trigger.Identifier, {accessory: null, trigger: trigger});
                }
                else {
                    this.log(`Trigger Identifier '${identifier}' already used.`);
                }
            });
        }
        else {
            throw new TypeError(`Configuration is invalid.`);
        }

        // Register for the Did Finish Launching event
        this._api.on('didFinishLaunching', this._bindDoInitialization);
        this._api.on('shutdown', this._bindDestructorNormal);

        // Register for shutdown events.
        // do something when app is closing
        process.on('exit', this._bindDestructorNormal);
        // catches uncaught exceptions
        process.on('uncaughtException', this._bindDestructorAbnormal);
    }

    /**
     * @description Destructor
     * @param {object} options - Typically containing a "cleanup" or "exit" member.
     * @param {object} err - The source of the event trigger.
     * @returns {void}
     * @async
     * @private
     */
    async _destructor(options, err) {
        // Is there an indication that the system is either exiting or needs to
        // be cleaned up?
        if ((options.exit) || (options.cleanup)) {
            this._log.debug('Terminating the triggers.');
            this._log.debug(err);
            // Iterate over all of the triggers and unsubscribe from the events.
            this._triggers.forEach((value, key)=>{
                if (_is.object(value) &&
                    (_is.not.undefined(value.trigger) && (value.trigger instanceof TimeTrigger))) {
                    this._log.debug(`Unsubscribing trigger: '${value.trigger.Identifier}'`);
                    value.trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, this._CB_TriggerStateChanged);
                    value.trigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, this._CB_TriggerStateNotify);
                }
            });
        }
        // Lastly eliminate myself.
        delete this;
    }

    /**
     * @description Event handler when the system has loaded the platform.
     * @returns {void}
     * @throws {RangeError} - thrown if an orphaned accessory is found after purge.
     * @async
     * @private
     */
    async _doInitialization() {
        this._log(`Homebridge Plug-In ${_PackageInfo.CONFIG_INFO.platform} has finished launching.`);

        // Flush any accessories as needed.
        const accessoriesToRemove = [];
        for (const item of this._triggers.values()) {
            let removed = false;
            if (_is.not.undefined(item.accessory) &&
                (item.accessory instanceof _PlatformAccessory)) {
                const accessory = item.accessory;
                // Accessory is from a prior version and needs to be replaced.
                if (!Object.prototype.hasOwnProperty.call(accessory.context, 'VERSION') ||
                    (accessory.context.VERSION !== ACCESSORY_VERSION)) {
                    this._log.debug(`Accessory '${accessory.displayName}' has accessory version ${accessory.context.VERSION}. Version ${ACCESSORY_VERSION} is expected.`);
                    // This accessory needs to be replaced.
                    accessoriesToRemove.push(accessory);
                    removed = true;
                }
                // If this accessory was not previously removed, does the accessory have a matching trigger?
                if (!removed) {
                    this._log.debug(`Checking to see if accessory '${accessory.displayName}' is an orphan.`);
                    let isOrphan = true;
                    for (const item of this._triggers.values()) {
                        if (Object.prototype.hasOwnProperty.call(accessory.context, 'ID') &&
                            _is.existy(item.trigger) &&
                            (item.trigger instanceof TimeTrigger) &&
                            (_is.equal(item.trigger.Signature, accessory.context.ID))) {
                            // Accessory is not an orphan.
                            isOrphan = false;
                            break;
                        }
                    }
                    if (isOrphan) {
                        this._log.debug(`Accessory '${accessory.displayName}' is an orphan and should be purged.`);
                        // This accessory needs to be removed.
                        accessoriesToRemove.push(accessory);
                    }
                }
            }
        }
        // Perform the cleanup.
        accessoriesToRemove.forEach((accessory) => {
            this._removeAccessory(accessory);
        });

        // Manage the accessories and triggers.
        for (const item of this._triggers.values()) {
            let accessory = item.accessory;
            if (_is.existy(item.trigger) &&
                (item.trigger instanceof TimeTrigger)) {
                // Is this trigger new?
                if (_is.not.existy(accessory)) {
                    // There is no matching accessory for this trigger.
                    // Create and register an accessory.
                    accessory = this._addTriggerAccessory(item.trigger.Identifier);
                }

                // Register for the trigger events.
                item.trigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, this._CB_TriggerStateChanged);
                item.trigger.on(TRIGGER_EVENTS.EVENT_STATE_NOTIFY,  this._CB_TriggerStateNotify);

                // Is the accessory active?
                if (this._getAccessorySwitchState(accessory)) {
                    // Start the Trigger.
                    // eslint-disable-next-line new-cap
                    item.trigger.Start();
                }
            }
            else if (_is.existy(accessory)) {
                this._log.debug(`Unexpected orphaned trigger '${accessory.displayName}.`);
                throw new RangeError(`Orphaned accessory is found.`);
            }
        }
    }

    /**
     * @description Homebridge API invoked after restoring cached accessorues from disk.
     * @param {_PlatformAccessory} accessory - Accessory to be configured.
     * @returns {void}
     * @throws {TypeError} - thrown if 'accessory' is not a PlatformAccessory
     * @private
     */
    configureAccessory(accessory) {
        // Validate the argument(s)
        if ((accessory === undefined) ||
            (!(accessory instanceof _PlatformAccessory))) {
            throw new TypeError('accessory must be a PlatformAccessory');
        }

        // Is this accessory already registered?
        let found = false;
        for (const item of this._triggers.values()) {
            if (_is.not.undefined(item.accessory) &&
                (item.accessory instanceof _PlatformAccessory)) {
                if (item.accessory === accessory) {
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            // Configure the accessory (also registers it.)
            try {
                this._configureAccessory(accessory);
            }
            catch (error) {
                this._log.debug(`Unable to configure accessory '${accessory.displayName}'. Version:${accessory.context.VERSION}. Error:${error}`);
                // Store the acessory without a trigger.
                this._triggers.set(accessory.contect.ID, {accessory: accessory, trigger: null});
            }
        }
    }

    /**
     * @description Performs accessory configuration and internal 'registration' (appending to our list).
     *              Opportunity to setup event handlers for characteristics and update values (as needed).
     * @param {_PlatformAccessory} accessory - Accessory to be configured/registered
     * @returns {void}
     * @throws {TypeError} - thrown if 'accessory' is not a PlatformAccessory
     * @private
     */
    _configureAccessory(accessory) {
        if ((accessory === undefined) ||
            (!(accessory instanceof _PlatformAccessory))) {
            throw new TypeError(`accessory must be a PlatformAccessory`);
        }

        this._log.debug(`Configuring accessory ${accessory.displayName}'.`);

        // Get the accessory identifier from the context.
        const id = accessory.context.ID;

        // Register to handle the Identify request for the accessory.
        accessory.on(_PlatformAccessory.PlatformAccessoryEvent.IDENTIFY, () => {
            this._log('%s identified!', accessory.displayName);
        });

        // Does this accessory have a Switch service?
        let switchState = true;
        const serviceSwitch = accessory.getService(_hap.Service.Switch);
        if (_is.existy(serviceSwitch) &&
            (serviceSwitch instanceof _hap.Service.Switch)) {
            // Set the switch to the stored setting (the default is on).
            const theSettings = accessory.context.SETTINGS;
            if ((theSettings !== undefined) &&
                _is.object(theSettings) &&
                (Object.prototype.hasOwnProperty.call(theSettings, 'SwitchState') &&
                _is.boolean(theSettings.SwitchState))) {
                // Modify the settings
                switchState = theSettings.SwitchState;
            }
            serviceSwitch.updateCharacteristic(_hap.Characteristic.On, switchState);

            // Get the 'On' characteristic for the switch.
            const charOn = serviceSwitch.getCharacteristic(_hap.Characteristic.On);
            // Register for the "get" event notification.
            charOn.on('get', this._handleOnGet.bind(this, id));
            // Register for the "set" event notification.
            charOn.on('set', this._handleOnSet.bind(this, id));
        }

        // Update the names of each service.
        const infoItems = [SERVICE_INFO.CONTROL, SERVICE_INFO.MOTION];
        for (const item of infoItems) {
            const service = accessory.getServiceById(item.uuid, item.udst);
            if (_is.existy(service)) {
                service.updateCharacteristic(_hap.Characteristic.Name, `${item.name}-(${accessory.displayName})`);
            }
        }

        // Initialize the motion sensor.
        try {
            this._log.debug(`Updating motion sensor service. Accessory(${accessory.displayName})`);
            this._updateMotionSensorService(accessory, SERVICE_INFO.MOTION, {active: switchState, motion: false});

            // Update the accessory information
            this._updateAccessoryInfo(accessory, {model: 'GrumpTech Time-Based Triggers', serialnum: id});

            // Find the unused trigger with the matching id.
            let found = false;
            this._triggers.forEach((item, index) => {
                if (_is.existy(item.trigger) && (item.trigger instanceof TimeTrigger) &&
                    _is.equal(item.trigger.Signature, id) &&
                    _is.not.existy(item.accessory)) {
                    // Match found.
                    found = true;
                    // Register the accessory.
                    this._log.debug(`Adding accessory '${accessory.displayName}' to the triggers list. Count:${this._triggers.size}`);
                    item.accessory = accessory;
                }
            });
            if (!found) {
                // Accessory appears to be an orphan.
                this._log.debug(`Adding ORPHAN accessory '${accessory.displayName}' to the triggers list. Count:${this._triggers.size}`);
                this._triggers.set(id, {accessory: accessory, trigger: null});
            }
        }
        catch (error) {
            this._log.debug(`Error configuring accessory '${accessory.displayName}'. Error:'${error}'`);
        }
    }

    /**
     * @description Create and register an accessory for the trigger.
     * @param {string} id identifier for the trigger.
     * @returns {_PlatformAccessory} accessory added.
     * @throws {TypeError} - thrown when 'id' is not a string.
     * @throws {RangeError} - thrown when 'id' length is 0
     * @throws {Error} - thrown when an accessory with 'id' is already registered.
     * @throws {Error} - thrown when there is no matching trigger.
     * @private
     */
    _addTriggerAccessory(id) {
        // Validate arguments
        if (_is.not.string(id)) {
            throw new TypeError(`id must be a string`);
        }
        if (id.length <= 0) {
            throw new RangeError(`id must be a non-zero length string.`);
        }

        const candidate = this._triggers.get(id);
        if (_is.not.existy(candidate)) {
            throw new Error(`'${id}' is not registered at all.`);
        }
        if (_is.not.existy(candidate.trigger)) {
            throw new Error(`Trigger Accessory '${id}' has no trigger.`);
        }
        if (_is.existy(candidate.accessory)) {
            throw new Error(`Trigger Accessory '${id}' is already registered.`);
        }

        // Get the trigger associated with this 'id'.
        if (_is.not.existy(candidate) || _is.not.existy(candidate.trigger)) {
            throw new Error(`Trigger Accessory '${id}' has no trigger.`);
        }

        this._log.debug(`Adding new accessory: id:'${id}'`);

        // Create the platform accesory
        // uuid must be generated from a unique but not changing data source.
        const uuid = _hap.uuid.generate(candidate.trigger.Signature);

        const accessory = new _PlatformAccessory(candidate.trigger.Name, uuid);

        // Add the identifier to the accessory's context. Used for remapping on depersistence.
        accessory.context.ID = candidate.trigger.Signature;
        // Mark the version of the accessory. This is used for depersistence
        accessory.context.VERSION = ACCESSORY_VERSION;
        // Create accessory persisted settings
        accessory.context.SETTINGS = {SwitchState: true};

        // Create our services.
        accessory.addService(_hap.Service.Switch,       SERVICE_INFO.CONTROL.uuid,  SERVICE_INFO.CONTROL.udst);
        accessory.addService(_hap.Service.MotionSensor, SERVICE_INFO.MOTION.uuid,   SERVICE_INFO.MOTION.udst);

        try {
            // Configure the accessory
            this._configureAccessory(accessory);
        }
        catch (error) {
            this._log.debug(`Error when configuring accessory.`);
            this._log.debug(error);
        }

        this._api.registerPlatformAccessories(_PackageInfo.CONFIG_INFO.plugin, _PackageInfo.CONFIG_INFO.platform, [accessory]);

        return accessory;
    }

    /**
     * @description Remove/destroy an accessory
     * @param {_PlatformAccessory} accessory - accessory to be removed.
     * @returns {void}
     * @throws {TypeError} - Thrown when 'accessory' is not an instance of _PlatformAccessory.
     * @throws {RangeError} - Thrown when a 'accessory' is not registered.
     * @private
     */
    _removeAccessory(accessory) {
        // Validate arguments
        if ((accessory === undefined) || !(accessory instanceof _PlatformAccessory)) {
            throw new TypeError(`Accessory must be a PlatformAccessory`);
        }
        let found = false;
        this._triggers.forEach((item, index) => {
            if (!found && (item.accessory === accessory)) {
                found = true;
            }
        });
        if (!found) {
            throw new RangeError(`Accessory '${accessory.displayName}' is not registered.`);
        }

        this._log.debug(`Removing accessory '${accessory.displayName}'`);

        // Event Handler cleanup.
        accessory.removeAllListeners(_PlatformAccessory.PlatformAccessoryEvent.IDENTIFY);
        // Iterate through all the services on the accessory
        for (const service of accessory.services) {
            // Is this service a Switch?
            if (service instanceof _hap.Service.Switch) {
                // Get the On characteristic.
                const charOn = service.getCharacteristic(_hap.Characteristic.On);
                // Build the identification id
                const id = `${service.displayName}.${service.subtype}`;
                // Register for the "get" event notification.
                // eslint-disable-next-line object-shorthand
                charOn.off('get', this._handleOnGet.bind(this, {accessory: accessory, service_id: id}));
                // Register for the "get" event notification.
                // eslint-disable-next-line object-shorthand
                charOn.off('set', this._handleOnSet.bind(this, {accessory: accessory, service_id: id}));
            }
        }

        /* Unregister the accessory */
        this._api.unregisterPlatformAccessories(_PackageInfo.CONFIG_INFO.plugin, _PackageInfo.CONFIG_INFO.platform, [accessory]);
        /* remove the accessory from our mapping */
        found = false;
        this._triggers.forEach((item, index) => {
            if (!found && (item.accessory === accessory)) {
                item.accessory = null;
                found = true;
            }
        });
    }

    /**
     * @description Update common information for an accessory
     * @param {_PlatformAccessory} accessory - accessory to be updated.
     * @param {object} info - accessory information.
     * @param {string | Error} info.model - accessory model number
     * @param {string | Error} info.serialnum - accessory serial number.
     * @returns {void}
     * @throws {TypeError} - Thrown when 'accessory' is not an instance of _PlatformAccessory.
     * @throws {TypeError} - Thrown when 'info' is not undefined, does not have the 'model' or
     *                       'serialnum' properties or the properties are not of the expected type.
     * @private
     */
    _updateAccessoryInfo(accessory, info) {
        // Validate arguments
        if ((accessory === undefined) || !(accessory instanceof _PlatformAccessory)) {
            throw new TypeError('Accessory must be a PlatformAccessory');
        }
        if ((info === undefined) ||
            (!Object.prototype.hasOwnProperty.call(info, 'model'))     || ((typeof(info.model)      !== 'string') || (info.model instanceof Error)) ||
            (!Object.prototype.hasOwnProperty.call(info, 'serialnum')) || ((typeof(info.serialnum)  !== 'string') || (info.serialnum instanceof Error))) {
            throw new TypeError('info must be an object with properties named \'model\' and \'serialnum\' that are either strings or Error');
        }

        /* Get the accessory info service. */
        const accessoryInfoService = accessory.getService(_hap.Service.AccessoryInformation);
        if (accessoryInfoService !== undefined) {
            /* Manufacturer */
            accessoryInfoService.updateCharacteristic(_hap.Characteristic.Manufacturer, 'GrumpTech');

            /* Model */
            accessoryInfoService.updateCharacteristic(_hap.Characteristic.Model, info.model);

            /* Serial Number */
            accessoryInfoService.updateCharacteristic(_hap.Characteristic.SerialNumber, info.serialnum);
        }
    }

    /**
     * @description Internal function to perform accessory configuration for Motion Sensor services.
     * @param {_PlatformAccessory} accessory - Accessory to be configured.
     * @param {object} serviceInfo - Name information of the service to be configured.
     * @param {string} serviceInfo.uuid   - UUID of the service
     * @param {string} serviceInfo.name   - Name of the service.
     * @param {string} serviceInfo.udst   - User Defined Sub-Type of the service.
     * @param {object} values             - Object containing the values being set
     * @param {boolean | Error} values.active      - true if active.
     * @param {boolean | Error} values.motion      - true if a motion is detected
     * @returns {void}
     * @throws {TypeError} - thrown if 'accessory' is not a PlatformAccessory
     * @throws {TypeError} - thrown if 'serviceInfo' does not conform to a serviceInfo item.
     * @throws {TypeError} - thrown if 'values' is not an object or does not contain the expected fields.
     * @throws {Error} - thrown if the service for the serviceName is not a Carbon Dioxide Sensor.
     * @private
     */
    _updateMotionSensorService(accessory, serviceInfo, values) {
        if (_is.not.existy(accessory) ||
            (!(accessory instanceof _PlatformAccessory))) {
            throw new TypeError(`accessory must be a PlatformAccessory`);
        }
        if (_is.not.existy(serviceInfo) ||
            _is.not.object(serviceInfo) ||
            (!Object.prototype.hasOwnProperty.call(serviceInfo, 'uuid') || _is.not.string(serviceInfo.uuid) || (serviceInfo.uuid.length <= 0)) ||
            (!Object.prototype.hasOwnProperty.call(serviceInfo, 'name') || _is.not.string(serviceInfo.name) || (serviceInfo.name.length <= 0)) ||
            (!Object.prototype.hasOwnProperty.call(serviceInfo, 'udst') || _is.not.string(serviceInfo.udst) || (serviceInfo.udst.length <= 0))   ) {
            throw new TypeError(`serviceName does not conform to a SERVICE_INFO item.`);
        }
        if (_is.not.existy(values) || _is.not.object(values) ||
            (!Object.prototype.hasOwnProperty.call(values, 'active')) || (_is.not.boolean(values.active) && !(values.active instanceof Error)) ||
            (!Object.prototype.hasOwnProperty.call(values, 'motion')) || (_is.not.boolean(values.motion) && !(values.motion instanceof Error))   ) {
            throw new TypeError(`values must be an object with properties named 'active' (boolean or Error) and 'motion' (boolean or Error)`);
        }

        // Attempt to get the named service and validate that it is a Carbon Dioxie Sensor
        const serviceMotion = accessory.getServiceById(serviceInfo.uuid, serviceInfo.udst);
        if (_is.existy(serviceMotion) &&
            (serviceMotion instanceof _hap.Service.MotionSensor)) {
            try {
                // Set the characteristics.
                serviceMotion.updateCharacteristic(_hap.Characteristic.StatusActive,     values.active);
                serviceMotion.updateCharacteristic(_hap.Characteristic.MotionDetected,   values.motion);
                serviceMotion.updateCharacteristic(_hap.Characteristic.StatusFault,      _hap.Characteristic.StatusFault.NO_FAULT);
                serviceMotion.updateCharacteristic(_hap.Characteristic.StatusLowBattery, _hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                serviceMotion.updateCharacteristic(_hap.Characteristic.StatusTampered,   _hap.Characteristic.StatusTampered.NOT_TAMPERED);
            }
            catch (err) {
                this._log.debug(`Error setting characteristics for '${accessory.displayName}'. Error: ${err}`);
            }
        }
        else {
            this._log.debug(`No service: Accessory '${accessory.displayName}'`);
            throw new Error(`Accessory ${accessory.displayName} does not have a valid ${serviceInfo.uuid}:${serviceInfo.udst} service`);
        }
    }

    /**
     * @description Event handler for the "get" event for the Switch.On characteristic.
     * @param {string} id - id of the accessory switch service being querried.
     * @param {Function} callback - Function callback for homebridge.
     * @returns {void}
     * @throws {TypeError} - thrown when 'id' is not a non-zero string.
     * @throws {Error} - Thrown when there is no accessory keyed with 'id'
     * @private
     */
    _handleOnGet(id, callback) {
        // Validate arguments
        if ((id === undefined) ||
            (typeof(id) !== 'string') || (id.length <= 0)) {
            throw new TypeError(`id must be a non-zero length string.`);
        }

        let status = null;
        let result = new Error(`id:${id} has no matching accessory`);
        this._triggers.forEach((item, index) => {
            if (_is.existy(item.accessory) &&
                _is.equal(item.accessory.context.ID, id)) {
                // Get the accessory for this id.
                const accessory = item.accessory;

                // Get the accessory for this id.
                this._log.debug(`Trigger '${accessory.displayName}' Get Request.`);

                try {
                    result = this._getAccessorySwitchState(accessory);
                }
                catch (err) {
                    this._log.debug(`  Unexpected error encountered: ${err.message}`);
                    result = false;
                    status = new Error(`Accessory ${accessory.displayName} is not ressponding.`);
                }
            }
        });

        // Invoke the callback function with our result.
        callback(status, result);
    }

    /**
     * @description Event handler for the "set" event for the Switch.On characteristic.
     * @param {string} id - id of the accessory switch service being set.
     * @param {boolean} value - new/requested state of the switch
     * @param {Function} callback - Function callback for homebridge.
     * @returns {void}
     * @throws {TypeError} - thrown when 'id' is not a non-zero string.
     * @throws {Error} - Thrown when there is no accessory keyed with 'id'
     * @private
     */
    _handleOnSet(id, value, callback) {
        // Validate arguments
        if ((id === undefined) ||
            (typeof(id) !== 'string') || (id.length <= 0)) {
            throw new TypeError(`id must be a non-zero length string.`);
        }

        this._log.debug(`Attempting to set trigger ${id} to ${value}`);
        let status = null;
        this._triggers.forEach((item, index) => {
            if (_is.existy(item.accessory) &&
                _is.equal(item.accessory.context.ID, id)) {
                const accessory = item.accessory;

                // Determine if this event is from a network target accessory.
                const isValidTrigger = _is.existy(item.trigger);

                // Store the state of the switch so that when the plugin is restarted, we will restore the
                // switch state as it was last set. But only do this for Triggers.
                if (isValidTrigger) {
                    const theSettings = accessory.context.SETTINGS;
                    if (_is.existy(theSettings) &&
                        _is.object(theSettings) &&
                        (Object.prototype.hasOwnProperty.call(theSettings, 'SwitchState')) &&
                        _is.boolean(theSettings.SwitchState)) {
                        // Modify the settings
                        theSettings.SwitchState = value;
                    }
                    // Store the updated settings.
                    accessory.context.SETTINGS = theSettings;
                }

                try {
                    // Is there a matching trigger for this 'id'?
                    if (isValidTrigger) {
                        const trigger = item.trigger;

                        // Note: State Change and State Notification events
                        //       will update the active and motion detected characteristics.
                        //       No need to worry about these here.

                        /* eslint-disable new-cap */
                        if (value) {
                            // Start the trigger !!
                            trigger.Start();
                        }
                        else {
                            // Note: Even after turning the trigger off, there will be at least one more event coming in.
                            trigger.Stop();
                        }
                        /* eslint-enable new-cap */
                    }
                    else {
                        this._log.debug(`Accessory ID:${id} has no matching trigger.`);
                        status =  new Error(`id:${id} has no matching trigger.`);
                    }
                }
                catch (err) {
                    this._log.debug(`Unexpected error encountered: ${err.message}`);

                    status = new Error(`Accessory ${accessory.displayName} is not ressponding.`);
                }
            }
        });

        callback(status);
    }

    /**
     * @description Get the value of the Service.Switch.On characteristic value
     * @param {object} accessory - accessory being querried.
     * @returns {boolean} the value of the On characteristic (true or false)
     * @throws {TypeError} - TThrown when 'accessory' is not an instance of _PlatformAccessory.
     * @throws {Error}  - Thrown when the On characteristic cannot be found on the accessory.
     * @private
     */
    _getAccessorySwitchState(accessory) {
        // Validate arguments
        if ((_is.not.existy(accessory)) || !(accessory instanceof _PlatformAccessory)) {
            throw new TypeError(`Accessory must be a PlatformAccessory`);
        }

        let result = false;
        const serviceSwitch = accessory.getService(_hap.Service.Switch);
        if (_is.existy(serviceSwitch)) {
            const charOn = serviceSwitch.getCharacteristic(_hap.Characteristic.On);
            if (_is.existy(charOn)) {
                result = charOn.value;
            }
            else {
                throw new Error(`The Switch service of accessory ${accessory.displayName} does not have an On charactristic.`);
            }
        }
        else {
            throw new Error(`Accessory ${accessory.displayName} does not have a Switch service.`);
        }

        return result;
    }

    /**
     * @description Event handler for the trigger state changed event.
     * @param {object} e - Event data
     * @param {string} e.uuid - Identifier of the trigger raising the event.
     * @param {TRIGGER_STATES} e.new_state - New state of the trigger
     * @param {TRIGGER_STATES} e.old_state - Old state of the trigger
     * @returns {void}
     * @throws {TypeError} - thrown when the arguments are invalid
     * @throws {RangeError} - thrown when the uuid is not associated with a known trigger.
     */
    _handleTriggerStateChanged(e) {
        if (_is.not.object(e) ||
            (_is.undefined(e.uuid) || _is.not.string(e.uuid)) ||
            (_is.undefined(e.new_state) || _is.not.number(e.new_state)) ||
            (_is.undefined(e.old_state) || _is.not.number(e.old_state))) {
            throw new TypeError(`Invalid state changed event.`);
        }
        if (!this._triggers.has(e.uuid)) {
            throw new RangeError(`Unknown state change event. uuid:${e.uuid}`);
        }

        // Determine if there is motion or not.
        const isMotion = (e.new_state === TRIGGER_STATES.Triggered);
        const isActive = (e.new_state !== TRIGGER_STATES.Inactive);

        // Get the accessory.
        const match = this._triggers.get(e.uuid);
        if (_is.existy(match) &&
            _is.existy(match.accessory)) {
            // Update the characteristics
            try {
                this._log(`TriggerStateChanged: Updating motion status for trigger ${match.accessory.displayName}. active=${isActive} motion=${isMotion}`);
                this._updateMotionSensorService(match.accessory, SERVICE_INFO.MOTION, {active: isActive, motion: isMotion});
            }
            catch {
            }
        }
    }

    /**
     * @description Event handler for the trigger state notify event.
     * @param {object} e - Event data
     * @param {string} e.uuid - Identifier of the trigger raising the event.
     * @param {TRIGGER_STATES} e.current_state - New state of the trigger
     * @returns {void}
     * @throws {TypeError} - thrown when the arguments are invalid
     * @throws {RangeError} - thrown when the uuid is not associated with a known trigger.
     */
    _handleTriggerStateNotify(e) {
        if (_is.not.object(e) ||
            (_is.undefined(e.uuid) || _is.not.string(e.uuid)) ||
            (_is.undefined(e.current_state) || _is.not.number(e.current_state))) {
            throw new TypeError(`Invalid state notify event.`);
        }
        if (!this._triggers.has(e.uuid)) {
            throw new RangeError(`Unknown state notify event. uuid:${e.uuid}`);
        }

        // Determine if there is motion or not.
        const isMotion = (e.current_state === TRIGGER_STATES.Triggered);
        const isActive = (e.current_state !== TRIGGER_STATES.Inactive);

        // Get the accessory.
        const match = this._triggers.get(e.uuid);
        if (_is.existy(match) &&
            _is.existy(match.accessory)) {
            // Update the characteristics
            try {
                this._log(`TriggerStateNotify: Updating motion status for trigger ${match.accessory.displayName}. active=${isActive} motion=${isMotion}`);
                this._updateMotionSensorService(match.accessory, SERVICE_INFO.MOTION, {active: isActive, motion: isMotion});
            }
            catch {
            }
        }
    }
}

/**
 * @description Exported default function for Homebridge integration.
 * @param {object} homebridgeAPI - reference to the Homebridge API.
 * @returns {void}
 */
export default (homebridgeAPI) => {
    _debug(`homebridge API version: v${homebridgeAPI.version}`);

    // Accessory must be created from PlatformAccessory Constructor
    _PlatformAccessory  = homebridgeAPI.platformAccessory;
    if (!Object.prototype.hasOwnProperty.call(_PlatformAccessory, 'PlatformAccessoryEvent')) {
        // Append the PlatformAccessoryEvent.IDENTITY enum to the platform accessory reference.
        // This allows us to not need to import anything from 'homebridge'.
        const platformAccessoryEvent = {
            IDENTIFY: 'identify',
        };

        _PlatformAccessory.PlatformAccessoryEvent = platformAccessoryEvent;
    }

    // Cache the reference to hap-nodejs
    _hap = homebridgeAPI.hap;

    // Register the paltform.
    _debug(`Registering platform: ${_PackageInfo.CONFIG_INFO.platform}`);
    homebridgeAPI.registerPlatform(_PackageInfo.CONFIG_INFO.platform, TimeTriggerPlatform);
};