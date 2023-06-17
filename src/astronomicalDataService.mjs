/* eslint-disable new-cap */
/**
 * @description Manages astronomical data using services from the US Naval Observatory @see {@link https://aa.usno.navy.mil}
 * @copyright 2023-2023
 * @author Mike Price <dev.grumptech@gmail.com>
 * @module AstronomicalDataModule
 * @requires events
 * @see {@link https://nodejs.org/dist/latest-v16.x/docs/api/events.html#events}
 * @requires debug
 * @see {@link https://github.com/debug-js/debug#readme}
 * @requires is-it-check
 * @see {@link https://github.com/evdama/is-it-check}
 * @requires https
 * @see {@link https://nodejs.org/dist/latest-v18.x/docs/api/https.html#https}
 */

// External dependencies and imports.
import EventEmitter from 'events';
import _debugModule from 'debug';
import _is from 'is-it-check';
import _https from 'node:https';

/**
 * @description Debugging function pointer for runtime related diagnostics.
 * @private
 */
// eslint-disable-next-line camelcase, no-unused-vars
const _debug = _debugModule('astro_data');

/**
 * @description Minimum Latitude
 * @private
 */
const MIN_LATITUDE = -90.0;
/**
 * @description Maximum Latitude
 * @private
 */
const MAX_LATITUDE = 90.0;
/**
 * @description Minimum Longitude
 * @private
 */
const MIN_LONGITUDE = -180.0;
/**
 * @description Maximum Longitude
 * @private
 */
const MAX_LONGITUDE = 180.0;

/**
 * @description Enumeration of published events.
 * @readonly
 * @private
 * @enum {string}
 * @property {string} EVENT_DATA_PROCESSING - Identification for the event published when initiatng astronomical data processing.
 * @property {string} EVENT_DATA_PROCESS_COMPLETE - Identification for the event published when initiatng astronomical data processing completes.
 */
export const ASTRONOMICAL_DATA_EVENTS = {
    /* eslint-disable key-spacing */
    EVENT_DATA_PROCESSING       : 'astronomical_data_processing',
    EVENT_DATA_PROCESS_COMPLETE : 'astronomical_data_process_complete',
    /* eslint-enable key-spacing */
};

/**
 * @description Astronomical Data Processing
 * @event module:AstronomicalDataModule#event:astronomical_data_processing
 * @type {object}
 * @param {boolean} e.processing -Flag indicating the astronomical data is being updated.
 * @private
 */
/**
 * @description Astronomical Data Process Complete
 * @event module:AstronomicalDataModule#event:astronomical_data_process_complete
 * @type {object}
 * @param {boolean} e.status -Flag indicating the is the data was successfully processed.
 * @private
 */
/**
 * @description Astronomical Data
 * @augments EventEmitter
 */
export class AstronomicalData extends EventEmitter {
    /**
     * @description Constructor
     * @param {object} config - Configuration data (Not used)
     * @class
     */
    constructor(config) {
        // Initialize the base class.
        super();

        this._reset();
    }

    /**
     * @description Read only accessor to the raw data.
     * @returns {object | undefined} - Raw response from US Naval Observatory
     */
    get RawData() {
        return this._rawData;
    }

    /**
     * @description Read Only accessor indicating data validity.
     * @returns {boolean} - true if data are valid. false otherwise.
     */
    get Valid() {
        return this._isValid;
    }

    /**
     * @description Read only accessor for the version of the US Naval Observatory Astronomical API.
     * @returns {string | undefined} - API Version
     */
    get APIVersion() {
        let apiVersion = undefined;

        if (this.Valid &&
            _is.not.undefined(this.RawData)) {
            apiVersion = this.RawData.apiversion;
        }

        return apiVersion;
    }

    /**
     * @description Read only accessor for the response type.
     * @returns {string | undefined} - Response type
     */
    get Type() {
        let responseType = undefined;

        if (this.Valid &&
            _is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.geometry) &&
            _is.string(this.RawData.geometry.type)) {
            responseType = this.RawData.geometry.type;
        }

        return responseType;
    }

    /**
     * @description Read only accessor for response latitude.
     * @returns {number | undefined} - Response latitude
     */
    get Latitude() {
        let latitude = undefined;

        if (this.Valid &&
            _is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.geometry) &&
            _is.array(this.RawData.geometry.coordinates) &&
            _is.number(this.RawData.geometry.coordinates[1])) {
            latitude = this.RawData.geometry.coordinates[1];
        }

        return latitude;
    }

    /**
     * @description Read only accessor for response longitude.
     * @returns {number | undefined} - Response longitude
     */
    get Longitude() {
        let latitude = undefined;

        if (this.Valid &&
            _is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.geometry) &&
            _is.array(this.RawData.geometry.coordinates) &&
            _is.number(this.RawData.geometry.coordinates[0])) {
            latitude = this.RawData.geometry.coordinates[0];
        }

        return latitude;
    }

    /**
     * @description Read only accessor for the date of the active request.
     * @returns {Date | undefined} - Date of the request data in local time.
     */
    get Date() {
        const internalDate = this._internalDate;
        let date = undefined;

        // Ensure that the raw data results are in UTC.
        if (_is.not.undefined(internalDate)) {
            // Convert to local time
            /* eslint-disable indent */
            date = new Date(internalDate.getUTCFullYear(), internalDate.getUTCMonth(), internalDate.getUTCDate(),
                            0, 0, 0, 0);
            /* eslint-enable indent */
        }

        return date;
    }

    /**
     * @description Read only accessor for the lunar phase.
     * @returns {string | undefined} - Lunar phase
     */
    get LunarPhase() {
        let phase = undefined;

        if (this.Valid &&
            _is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.properties) &&
            _is.not.undefined(this.RawData.properties.data)) {
            // If the current phase is same as the closest phase, there will be no current phase.
            if (_is.string(this.RawData.properties.data.curphase)) {
                phase = this.RawData.properties.data.curphase;
            }
            else if (_is.not.undefined(this.RawData.properties.data.closestphase) &&
                     _is.string(this.RawData.properties.data.closestphase.phase)) {
                phase = this.RawData.properties.data.closestphase.phase;
            }
        }

        return phase;
    }

    /**
     * @description Read only accessor for the start of twilight.
     * @returns {Date | undefined} - Date of the start of twilight for the requested date.
     */
    get TwilightStart() {
        const date = this._getSolarPhenomenonDateTime('Begin Civil Twilight');

        return date;
    }


    /**
     * @description Read only accessor for the end of twilight.
     * @returns {Date | undefined} - Date of the end of twilight for the requested date.
     */
    get TwilightEnd() {
        const date = this._getSolarPhenomenonDateTime('End Civil Twilight');

        return date;
    }

    /**
     * @description Read only accessor for sunrise.
     * @returns {Date | undefined} - Date of sunrise for the requested date.
     */
    get SolarRise() {
        const date = this._getSolarPhenomenonDateTime('Rise');

        return date;
    }

    /**
     * @description Read only accessor for sunset.
     * @returns {Date | undefined} - Date of sunset for the requested date.
     */
    get SolarSet() {
        const date = this._getSolarPhenomenonDateTime('Set');

        return date;
    }

    /**
     * @description Read only accessor for solar transit.
     * @returns {Date | undefined} - Date of solar transit for the requested date.
     */
    get SolarTransit() {
        const date = this._getSolarPhenomenonDateTime('Upper Transit');

        return date;
    }

    /**
     * @description Read only accessor for moon rise.
     * @returns {Date | undefined} - Date of moon rise for the requested date.
     */
    get LunarRise() {
        const date = this._getLunarPhenomenonDateTime('Rise');

        return date;
    }

    /**
     * @description Read only accessor for moon set.
     * @returns {Date | undefined} - Date of moon set for the requested date.
     */
    get LunarSet() {
        const date = this._getLunarPhenomenonDateTime('Set');

        return date;
    }

    /**
     * @description Read only accessor for transit of the moon.
     * @returns {Date | undefined} - Date of lunar transit for the requested date.
     */
    get LunarTransit() {
        const date = this._getLunarPhenomenonDateTime('Upper Transit');

        return date;
    }

    /**
     * @description Helper for requesting and collecting astronomical point data.
     * @param {object} config - Configuration data
     * @param {string=} config.id - Identifier used for the request. If not specified use 'GrmpTec'.
     * @param {Date=} config.date - Observation Date. If not specified use current time.
     * @param {object} config.location - Location for the astronomical data.
     * @param {number} config.location.latitude - Latitude
     * @param {object} config.location.longitude - longitude
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @throws {RangeError} - Thrown if 'config' is invalid.
     * @returns {void}
     * @fires module:AstronomicalDataModule#event:astronomical_data_processing
     * @fires module:AstronomicalDataModule#event:astronomical_data_complete
     */
    RequestAstronomicalOneDayData(config) {
        const MARKER_ID = '{ID}';
        const MARKER_YEAR = '{YEAR}';
        const MARKER_MONTH = '{MONTH}';
        const MARKER_DAY = '{DAY}';
        const MARKER_LATITUDE = '{LATITUDE}';
        const MARKER_LONGITUDE = '{LONGITUDE}';
        // Note: Timezone for request is hard coded for UTC.
        const ASTRO_REQUEST_TEMPLATE = `/api/rstt/oneday?ID=${MARKER_ID}&date=${MARKER_YEAR}-${MARKER_MONTH}-${MARKER_DAY}&coords=${MARKER_LATITUDE},${MARKER_LONGITUDE}&tz=0`;

        // Validate arguments
        if (_is.not.undefined(config)) {
            if (_is.not.object(config)) {
                throw new TypeError(`Invalid configuration.`);
            }
            if (_is.not.undefined(config.id) && _is.not.string(config.id)) {
                throw new RangeError(`Invalid configuration. ID=${config.id}`);
            }
            if (_is.not.undefined(config.date) && _is.not.date(config.date)) {
                throw new RangeError(`Invalid configuration. Date=${config.date}`);
            }
            // Validate the location
            AstronomicalData.CheckLocation(config);
        }
        else {
            throw new TypeError(`config is unspecified.`);
        }

        // Get the identifier to use for the request.
        // Note: 'AA` is reserved for internal use by the US Naval Observatory
        // Note: Identifier can be up to 8 characters.
        let id = 'GrmpTech';
        if (_is.not.undefined(config.id) &&
            _is.above(config.id.length, 0) &&
            _is.not.equal(config.id, 'AA')) {
            id = config.id.substring(0, 8);
        }

        // Get the date for the astronomical data
        let date = new Date(); // Local time.
        if (_is.not.undefined(config.date)) {
            date = config.date;
        }
        /* eslint-disable indent */
        const utcDate = new Date(Date.UTC(date.getFullYear(),
                                          date.getMonth(),
                                          date.getDate()));
        /* eslint-enable indent */

        // Compute the request path.
        let requestPath = ASTRO_REQUEST_TEMPLATE;
        requestPath = requestPath.replace(MARKER_ID, id);
        requestPath = requestPath.replace(MARKER_YEAR, utcDate.getUTCFullYear().toString());
        requestPath = requestPath.replace(MARKER_MONTH, (utcDate.getUTCMonth() + 1).toString());
        requestPath = requestPath.replace(MARKER_DAY, utcDate.getUTCDate().toString());
        requestPath = requestPath.replace(MARKER_LATITUDE, config.location.latitude.toString());
        requestPath = requestPath.replace(MARKER_LONGITUDE, config.location.longitude.toString());

        // Reset the internal data
        this._reset();

        // eslint-disable-next-line no-unused-vars
        let responseLength = 0;
        let result = undefined;
        let responseInitiated = false;
        let error = false;
        // Connection information to get the astronomical data.
        const options = {
            hostname: 'aa.usno.navy.mil',
            protocol: 'https:',
            port: 443,
            path: requestPath,
            method: 'GET',
            timeout: 10000,
        };

        // Create the request.
        _debug(`${config.location.latitude},${config.location.longitude}: request`);
        const req = _https.request(options, (res) => {
            _debug(`statusCode: ${res.statusCode}`);
            _debug(`headers:`);
            _debug(res.headers);

            // Response event handlers.
            // Handle the 'data' notifications.
            res.on('data', (d) => {
                if (result === undefined) {
                    result = d;
                }
                else {
                    result += d;
                }
                responseLength += d.length;
            });

            // Handle the completion event.
            res.on('end', ()=>{
                // Process the response
                // Convert the response data to an object.
                try {
                    this._rawData = JSON.parse(result.toString());
                    _debug(`Response:\n${result.toString()}`);

                    // Determine if the result was successful.
                    if (_is.not.undefined(this.RawData.error)) {
                        // Unsuccessful
                        _debug(`Response error: '${this.RawData.error}'`);
                        error = true;
                    }
                    else {
                        // Response was valid.
                        this._isValid = true;
                    }
                }
                catch (e) {
                    _debug(`Error parsing response.`);
                    _debug(e);
                    error = true;
                }
            });
        });
        // Request event handlers.
        // Handle the request close event
        req.on('close', () => {
            // Issue event notifications.
            setImmediate(() => {
                this.emit(ASTRONOMICAL_DATA_EVENTS.EVENT_DATA_PROCESSING, {processing: false});
            });

            if (_is.falsy(responseInitiated)) {
                _debug(`No response when getting astronomical data.`);

                // Flag the error.
                error = true;
            }

            _debug(`${config.location.latitude},${config.location.longitude}: close - resp:${responseInitiated}  err:${error}`);

            // Issue the notification
            setImmediate(() => {
                this.emit(ASTRONOMICAL_DATA_EVENTS.EVENT_DATA_PROCESS_COMPLETE, {status: error});
            });
        });
        // Handle the request response notification.
        req.on('response', () => {
            _debug(`${config.location.latitude},${config.location.longitude}: response`);

            responseInitiated = true;
        });
        // Handle the "timeout" event. Used to abort the request
        req.on('timeout', () => {
            _debug(`${config.location.latitude},${config.location.longitude}: timeout - resp:${responseInitiated}`);

            // Has the request response been initiated.
            if (_is.falsy(responseInitiated)) {
                // Abort the request
                req.destroy();
            }
        });
        // Handle error notification.
        req.on('error', (e) => {
            _debug(`${config.location.latitude},${config.location.longitude}: error - ${responseInitiated}`);
            _debug(e);

            // Flag the error
            error = true;
        });
        // Notify that processing has started.
        this.emit(ASTRONOMICAL_DATA_EVENTS.EVENT_DATA_PROCESSING, {processing: true});
        // Initiate the transaction
        req.end();
    }

    /**
     * @description Helper to reset the internal data.
     * @returns {void}
     * @private
     */
    _reset() {
        this._isValid = false;
        this._rawData = undefined;
    }

    /**
     * @description Read only accessor for the internal date of the active request.
     * @returns {Date | undefined} - Date of the request data in UTC.
     */
    get _internalDate() {
        let internalDate = undefined;

        // Ensure that the raw data results are in UTC.
        if (this.Valid &&
            _is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.properties) &&
            _is.not.undefined(this.RawData.properties.data) &&
            _is.not.undefined(this.RawData.properties.data.year) &&
            _is.not.undefined(this.RawData.properties.data.month) &&
            _is.not.undefined(this.RawData.properties.data.day) &&
            _is.not.undefined(this.RawData.properties.data.tz) &&
            _is.equal(this.RawData.properties.data.tz, 0.0)) {
            /* eslint-disable indent */
            internalDate = new Date(Date.UTC(this.RawData.properties.data.year,
                                             (this.RawData.properties.data.month - 1),
                                             this.RawData.properties.data.day,
                                             0, 0, 0, 0));
            /* eslint-enable indent */
        }

        return internalDate;
    }

    /**
     * @description Helper to get the Internal Date/Time for the specified phenomenon
     * @param {object[]} phenList - Array of phenomenon.
     * @param {string} phenList.phen - Phenomenon name
     * @param {string} phenList.time - Time of the phenomenon (hh:mm)
     * @param {string} phenomenon - Specified phenomen
     * @returns {Date | undefined} - DateTime for the specified phenomenon.
     * @private
     */
    _getPhenomenonDateTime(phenList, phenomenon) {
        const phenDateTime = this._internalDate;
        let date = undefined;

        if (_is.date(phenDateTime) &&
            _is.not.undefined(phenList) &&
            _is.array(phenList) &&
            _is.string(phenomenon)) {
            // Find find the desired phenomenon.
            const result = phenList.find((element) => {
                let match = false;
                // Find the matching phenomenon.
                if (_is.not.undefined(element.phen) && _is.string(element.phen) &&
                    _is.not.undefined(element.time) && _is.string(element.time)) {
                    match = _is.equal(element.phen.toLowerCase(), phenomenon.toLowerCase());
                }
                return match;
            });
            if (_is.not.undefined(result) &&
                _is.not.undefined(result.time) &&
                _is.string(result.time)) {
                // Split the phenomenon value by a ':' to separate the hours from minutes.
                const timeData = result.time.split(':');
                if (_is.array(timeData) && _is.equal(timeData.length, 2)) {
                    // Update the phenomenon time, in UTC
                    phenDateTime.setUTCHours(Number.parseInt(timeData[0]));
                    phenDateTime.setUTCMinutes(Number.parseInt(timeData[1]));

                    // set the response.
                    date = new Date(phenDateTime);
                }
            }
        }

        return date;
    }

    /**
     * @description Helper to get the Internal Date/Time for the specified solar phenomenon
     * @param {string} phenomenon - Specified phenomen
     * @returns {Date | undefined} - DateTime for the specified phenomenon.
     * @private
     */
    _getSolarPhenomenonDateTime(phenomenon) {
        let date = undefined;

        if (_is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.properties) &&
            _is.not.undefined(this.RawData.properties.data) &&
            _is.not.undefined(this.RawData.properties.data.sundata) &&
            _is.array(this.RawData.properties.data.sundata)) {
            date = this._getPhenomenonDateTime(this.RawData.properties.data.sundata, phenomenon);
        }

        return date;
    }

    /**
     * @description Helper to get the Internal Date/Time for the specified lunar phenomenon
     * @param {string} phenomenon - Specified phenomen
     * @returns {Date | undefined} - DateTime for the specified phenomenon.
     * @private
     */
    _getLunarPhenomenonDateTime(phenomenon) {
        let date = undefined;

        if (_is.not.undefined(this.RawData) &&
            _is.not.undefined(this.RawData.properties) &&
            _is.not.undefined(this.RawData.properties.data) &&
            _is.not.undefined(this.RawData.properties.data.moondata) &&
            _is.array(this.RawData.properties.data.moondata)) {
            date = this._getPhenomenonDateTime(this.RawData.properties.data.moondata, phenomenon);
        }

        return date;
    }

    /**
     * @description Helper for validating the location.
     * @param {object} config - Configuration data
     * @param {object} config.location - Location for the astronomical data.
     * @param {number} config.location.latitude - Latitude
     * @param {object} config.location.longitude - longitude
     * @throws {TypeError} - Thrown if 'config' is invalid.
     * @throws {RangeError} - Thrown if 'config' is invalid.
     * @returns {void}
     * @private
     */
    static CheckLocation(config) {
        if (_is.undefined(config.location) || _is.not.object(config.location) ||
            _is.not.number(config.location.latitude) || _is.not.number(config.location.longitude)) {
            throw new TypeError(`Invalid configuration. Location`);
        }
        if (_is.under(config.location.latitude, MIN_LATITUDE) || _is.above(config.location.latitude, MAX_LATITUDE)) {
            throw new RangeError(`Invalid Location. Latitide=${config.location.latitude}`);
        }
        if (_is.under(config.location.longitude, MIN_LONGITUDE) || _is.above(config.location.longitude, MAX_LONGITUDE)) {
            throw new RangeError(`Invalid Location. Longatude=${config.location.longitude}`);
        }
    }
}
