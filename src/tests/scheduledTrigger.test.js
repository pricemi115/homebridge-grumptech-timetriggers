/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import { TRIGGER_STATES, TRIGGER_DAYS, TRIGGER_EVENTS, ASTRONOMICAL_TRIGGERS, TIME_OFFSET_TYPES } from '../triggerTypes.mjs';
import { ScheduledTrigger } from '../scheduledTrigger.mjs';
import _is from 'is-it-check';

const DAYS_IN_WEEK = 7;

describe('Module-level tests', ()=>{
    test('Module ScheduledTrigger export expected value', ()=>{
        const trigger = new ScheduledTrigger();
        expect(trigger).toBeInstanceOf(ScheduledTrigger);
    });
});

describe('ScheduledTrigger class tests', ()=>{
    describe('Instance function/property invalid tests', ()=>{
        test('Invalid config', ()=>{
            function trigInvalidDays() {
                const test = new ScheduledTrigger({days: 'waffles'});
            }
            function trigNegDays() {
                const test = new ScheduledTrigger({days: (TRIGGER_DAYS.Sunday-1)});
            }
            function trigHighDays() {
                const test = new ScheduledTrigger({days: (TRIGGER_DAYS.AllDays+1)});
            }
            function trigInvalidTime1() {
                const test = new ScheduledTrigger({time: 'waffles'});
            }
            function trigInvalidTime2() {
                const test = new ScheduledTrigger({time: {}});
            }
            function trigInvalidTime3() {
                const test = new ScheduledTrigger({time: {nominal: 'waffles'}});
            }
            function trigInvalidTime4() {
                const test = new ScheduledTrigger({time: {tolerance: true}});
            }
            function trigInvalidTimeLowMinHour() {
                const test = new ScheduledTrigger({time: {nominal: {hour: -1, minute: 0}, tolerance: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeLowMinMinute() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 5, minute: -1}, tolerance: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeHighMinHour() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 24, minute: 0}, tolerance: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeHighMinMinute() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 5, minute: 61}, tolerance: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeLowMaxHour() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 7, minute: 0}, tolerance: {hour: -1, minute: 0}}});
            }
            function trigInvalidTimeLowMaxMinute() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 5, minute: 7}, tolerance: {hour: 10, minute: -1}}});
            }
            function trigInvalidTimeHighMaxHour() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 15, minute: 0}, tolerance: {hour: 24, minute: 0}}});
            }
            function trigInvalidTimeHighMaxMinute() {
                const test = new ScheduledTrigger({time: {nominal: {hour: 5, minute: 45}, tolerance: {hour: 10, minute: 61}}});
            }

            expect(trigInvalidDays).toThrow(TypeError);
            expect(trigNegDays).toThrow(RangeError);
            expect(trigHighDays).toThrow(RangeError);
            expect(trigInvalidTime1).toThrow(TypeError);
            expect(trigInvalidTime2).toThrow(TypeError);
            expect(trigInvalidTime3).toThrow(TypeError);
            expect(trigInvalidTime4).toThrow(TypeError);
            expect(trigInvalidTimeLowMinHour).toThrow(RangeError);
            expect(trigInvalidTimeLowMinMinute).toThrow(RangeError);
            expect(trigInvalidTimeHighMinHour).toThrow(RangeError);
            expect(trigInvalidTimeHighMinMinute).toThrow(RangeError);
            expect(trigInvalidTimeLowMaxHour).toThrow(RangeError);
            expect(trigInvalidTimeLowMaxMinute).toThrow(RangeError);
            expect(trigInvalidTimeHighMaxHour).toThrow(RangeError);
            expect(trigInvalidTimeHighMaxMinute).toThrow(RangeError);
        });
    });
    describe('Fixed Schedule Instance functionality tests', ()=>{
        describe.each([
            ['Pre Window',  {minOffset:  1, maxOffset:  2}, 0, TRIGGER_DAYS.AllDays],
            ['Pre Window - No Tolerance',  {minOffset:  1, maxOffset:  1}, 0, TRIGGER_DAYS.AllDays],
            ['Mid Window',  {minOffset: -1, maxOffset:  2}, 0, TRIGGER_DAYS.AllDays],
            ['Post Window', {minOffset: -2, maxOffset: -1}, 0, TRIGGER_DAYS.AllDays],
            ['Next Week',   {minOffset: -2, maxOffset: -1}, 7, 0],
        ])('Trigger Window Tests.', (desc, offsets, deltaDays, additionalDays) =>{
            test(desc, done =>{
                function handlerStateChanged(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        /* Manage Trigger Life Cycle */
                        if ((e.old_state === TRIGGER_STATES.Arming) &&
                            (e.new_state === TRIGGER_STATES.Armed)) {

                            const timeout = trigger.Timeout;
                            expect(timeout).toBeGreaterThanOrEqual(0.950*expectedMin);
                            expect(timeout).toBeLessThanOrEqual(1.050*expectedMax);

                            // Cleanup and end the test.
                            trigger.Stop();
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                            done();
                        }
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);
                        console.log(error);
                        done(error);
                    }
                };

                const now = new Date();
                const minWindow = new Date(now);
                const maxWindow = new Date(now);

                // Initiate the trigger test.
                minWindow.setHours(minWindow.getHours() + offsets.minOffset);
                maxWindow.setHours(maxWindow.getHours() + offsets.maxOffset);

                const todayDay = now.getDay();
                const targetDay = ((todayDay + deltaDays) % DAYS_IN_WEEK);
                const triggerDay = (1<<targetDay);

                // Compute the expected range
                let expectedMin = (minWindow - now)
                let expectedMax = (maxWindow - now);

                if (expectedMin < 0) {
                    if (expectedMax >= 0) {
                        expectedMin = 0;
                    }
                    else {
                        let dayOffset = 1;
                        let test = (1 << ((todayDay+1) % DAYS_IN_WEEK));
                        const mask = (triggerDay | additionalDays);
                        while ((test & mask) === 0) {
                            dayOffset++;
                            test = (test << 1);
                            if (test > TRIGGER_DAYS.Saturday) {
                                test = TRIGGER_DAYS.Sunday;
                            }
                        }

                        expectedMin += ((dayOffset*24.0)*3600.0*1000.0);
                        expectedMax += ((dayOffset*24.0)*3600.0*1000.0);
                    }
                }

                // Compute the offset for the expected value
                const expectedOffset = (minWindow.getMinutes()*60*1000) +
                                       (minWindow.getSeconds()*1000) +
                                       (minWindow.getMilliseconds());
                expectedMin -= expectedOffset;
                expectedMax += expectedOffset;

                // Compute the trigger nominal
                const winTolerance = ((maxWindow - minWindow)/2);
                let nominal = minWindow.getTime() + winTolerance;
                const nominalTime = new Date(nominal);
                // Compute the trigger tolerance
                const toleranceActual = (offsets.maxOffset - offsets.minOffset)/2;
                const tolHr = Math.floor(toleranceActual);
                const tolMin = Math.trunc(Math.ceil((toleranceActual - tolHr)*60));

                const config = {days: (triggerDay  | additionalDays), time: {nominal: {hour: nominalTime.getHours(), minute: nominalTime.getMinutes()}, tolerance: {hour: tolHr, minute: tolMin}}};
                const trigger = new ScheduledTrigger(config);
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
                // Decouple the start.
                setImmediate(() => {
                    trigger.Start();
                });
            });
        });
    });
    describe('Astronomical Instance functionality tests', ()=>{
        describe.each([
            ['No offset',               {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset - MR',          {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_RISE, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset - MS',          {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_SET, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset - ST',          {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SOALAR_TRANSIT, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset - LT',          {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_LUNAR_TRANSIT, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset = TE',          {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_END, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_BEFORE, hour: 0, minute: 20},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset - TS',          {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_START, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset',               {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset',               {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},   location: {latitude: 42, longitude: -71.25}}],
            ['No offset - with values', {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 1, minute: 1},   location: {latitude: 42, longitude: -71.25}}],
            ['Before',                  {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_BEFORE, hour: 1, minute: 30}, location: {latitude: 42, longitude: -71.25}}],
            ['After',                   {astroType:  ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET, astroOffset: {type: TIME_OFFSET_TYPES.TYPE_AFTER, hour: 1, minute: 59},  location: {latitude: 42, longitude: -71.25}}],
        ])('Astro Tests.', (desc, config) =>{
            test(desc, done =>{
                function getAstroTime(type) {
                    let date = undefined;
                    const astroResults = trigger._astroHelper.RSTOneDayData;
                    switch (type) {
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_LUNAR_TRANSIT: {
                            date = astroResults.lunar_transit;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_RISE: {
                            date = astroResults.lunar_rise;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_SET: {
                            date = astroResults.lunar_set;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SOALAR_TRANSIT: {
                            date = astroResults.solar_transit;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE: {
                            date = astroResults.solar_rise;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET: {
                            date = astroResults.solar_set;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_START: {
                            date = astroResults.twilight_start;
                            break;
                        }
                        case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_END: {
                            date = astroResults.twilight_end;
                            break;
                        }
                        default: {
                            // Not handled.
                            break;
                        }
                    }

                    return date;
                }
                function handlerStateChanged(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        /* Manage Trigger Life Cycle */
                        if (e.old_state === TRIGGER_STATES.Arming) {
                            if (e.new_state === TRIGGER_STATES.Armed) {
                                // Get the astronomical date.
                                const date = getAstroTime(config.astroType);

                                // Update the date based on the offset.
                                switch (config.astroOffset.type) {
                                    case TIME_OFFSET_TYPES.TYPE_BEFORE: {
                                        date.setHours(date.getHours() - config.astroOffset.hour);
                                        date.setMinutes(date.getMinutes() - config.astroOffset.minute);

                                        break;
                                    }
                                    case TIME_OFFSET_TYPES.TYPE_AFTER: {
                                        date.setHours(date.getHours() + config.astroOffset.hour);
                                        date.setMinutes(date.getMinutes() + config.astroOffset.minute);

                                        break;
                                    }
                                    case TIME_OFFSET_TYPES.TYPE_NONE:
                                    default: {
                                        // No-op
                                        break;
                                    }
                                }

                                expect(trigger._time.nominal.hour).toEqual(date.getHours());
                                expect(trigger._time.nominal.minute).toEqual(date.getMinutes());

                                // Cleanup and end the test.
                                trigger.Stop();
                                trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                                done();
                            }
                            // Trigger failed to arm.
                            else if (e.new_state === TRIGGER_STATES.Inactive) {
                                // Assume error.
                                let error = true;

                                // Handle known cases where astronomical dates are not available.
                                switch (config.astroType) {
                                    case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_SET: {
                                        const lunarPhase = trigger._astroHelper.LunarPhase;
                                        if (_is.equal(lunarPhase, 'New Moon') ||
                                            _is.equal(lunarPhase, 'Waning Crescent')) {
                                            // This is an expected result.
                                            error = undefined;
                                        }
                                        break;
                                    }
                                    default: {
                                        // Not handled.
                                        break;
                                    }
                                }

                                done(error);
                            }
                        }
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);

                        const astroResults = trigger._astroHelper.RSTOneDayData;
                        switch (config.astroType) {
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_SET: {
                                if (_is.equal(astroResults.lunar_phase, "New Moon")) {
                                    // Error is expected.
                                    error = undefined;
                                }
                                break;
                            }

                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_LUNAR_TRANSIT:
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_RISE:
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SOALAR_TRANSIT:
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE:
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET:
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_START:
                            case ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_END:
                            default: {
                                // Not handled.
                                break;
                            }
                        }

                        // Cleanup and end the test.
                        trigger.Stop();
                        trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
    
                        console.log(error);
                        done(error);
                    }
                };

                // Initiate the trigger test.
                const trgCfg = {astronomical_type: config.astroType, time: {astronomical_offset: config.astroOffset,
                                                                            nominal: {hour: 19, minute: 0},
                                                                            tolerance: {hour: 0, minute: 0}},
                                location: {latitude: config.location.latitude, longitude: config.location.longitude}};
                const trigger = new ScheduledTrigger(trgCfg);
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
                // Decouple the start.
                setImmediate(() => {
                    trigger.Start();
                });
            });
        });
    });
    describe('Time Shift Instance functionality tests', ()=>{
        describe.each([
            ['Shift Early',  {hour:  0, minute:  20}, (60*(60*1000))],
            ['Shift Later',  {hour:  0, minute:  20}, (-60*(60*1000))],
        ])('Time Shift tests', (desc, time_delta, time_shift_ms) =>{
            test(desc, done =>{
                function handlerStateNotification(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        /* current_state */
                        expect(e).toHaveProperty('current_state');
                        expect(_is.sameType(e.current_state, TRIGGER_STATES.Inactive)).toBeTruthy();

                        if (e.current_state == TRIGGER_STATES.Armed) {
                            expect(time_shift_ms).toBeGreaterThan(0);

                            // Check the time remaining
                            const actualTimeRemaining = trigger.TimeRemaining;
                            const expectedTimeRemaining = ((time_delta.hour * 3600 * 1000) +
                                                           (time_delta.minute * 60 * 1000)) -
                                                          trigger._remainingTimeCheckPeriod;
                            expect(actualTimeRemaining).toBeGreaterThanOrEqual(expectedTimeRemaining - 60000);
                            expect(actualTimeRemaining).toBeLessThanOrEqual(expectedTimeRemaining + 60000);

                            // Cleanup and end the test.
                            trigger.Stop();
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                            done();
                        }
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);
                        console.log(error);
                        
                        // Cleanup and end the test.
                        trigger.Stop();
                        trigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                        trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                        done(error);
                    }
                };
                function handlerStateChanged(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        /* Manage Trigger Life Cycle */
                        if ((e.old_state === TRIGGER_STATES.Arming) &&
                            (e.new_state === TRIGGER_STATES.Armed)) {
                            // Fake out the time remaining.
                            trigger._expectedTripTime.setTime(trigger._expectedTripTime.getTime() + time_shift_ms);
                        }
                        else if ((e.old_state === TRIGGER_STATES.Armed) &&
                                 (e.new_state === TRIGGER_STATES.Tripped)) {
                            expect(time_shift_ms).toBeLessThan(0);
                        }
                        else if ((e.old_state === TRIGGER_STATES.Tripped) &&
                                 (e.new_state === TRIGGER_STATES.Inactive)) {
                            // Cleanup and end the test.
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                            done();
                        }
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);
                        console.log(error);

                        // Cleanup and end the test.
                        trigger.Stop();
                        trigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                        trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                        done(error);
                    }
                };

                const triggerTime = new Date();
                triggerTime.setHours(triggerTime.getHours() + time_delta.hour);
                triggerTime.setMinutes(triggerTime.getMinutes() + time_delta.minute);

                const config = {time: {nominal: {hour: triggerTime.getHours(), minute: triggerTime.getMinutes()}, tolerance: {hour: 0, minute: 0}}, trip_limit: 1};
                const trigger = new ScheduledTrigger(config);
                trigger._remainingTimeCheckPeriod = 2000;
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
                // Decouple the start.
                setImmediate(() => {
                    trigger.Start();
                });
            });
        });
    });
    describe('Premature re-trigger Instance functionality tests', ()=>{
        describe.each([
            ['Short Duration',  1000],
        ])('Re-trigger tests', (desc, duration_ms) =>{
            test(desc, done =>{
                function handlerStateNotification(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        /* current_state */
                        expect(e).toHaveProperty('current_state');
                        expect(_is.sameType(e.current_state, TRIGGER_STATES.Inactive)).toBeTruthy();
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);
                        console.log(error);
                        done(error);
                    }
                };
                function handlerStateChanged(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        /* Manage Trigger Life Cycle */
                        if (e.new_state === TRIGGER_STATES.Arming) {
                            if (trip_count === 1) {
                                tripped_time = new Date();
                            }

                            trip_count += 1;
                            expect(trip_count).toBeGreaterThan(0);
                            expect(trip_count).toBeLessThanOrEqual(2);
                        }
                        else if ((e.old_state === TRIGGER_STATES.Arming) &&
                                 (e.new_state === TRIGGER_STATES.Armed)) {
                            if (trip_count === 2) {
                                // Ensure that the trigger is scheduled for the next day.
                                const expected = (tripped_time.getTime() + (24.0*60.0*60.0*1000.0)) - (2.0*(tolerance_min*60.0*1000.0));
                                const actual = (Date.now() + trigger.TimeRemaining);
                                expect(actual).toBeGreaterThanOrEqual(expected);

                                // Cleanup and end the test.
                                trigger.Stop();
                            }
                        }
                        else if ((e.old_state === TRIGGER_STATES.Armed) &&
                                 (e.new_state === TRIGGER_STATES.Inactive)) {
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                            trigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);

                            done();
                        }
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);
                        console.log(error);
                        done(error);
                    }
                };

                const tolerance_min = 1;
                let trip_count = 0;
                let tripped_time = undefined;
                const triggerTime = new Date();
                const config = {time: {nominal: {hour: triggerTime.getHours(), minute: triggerTime.getMinutes()}, tolerance: {hour: 0, minute: tolerance_min}}, trip_limit: 0};

                const trigger = new ScheduledTrigger(config);
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
                // Decouple the start.
                setImmediate(() => {
                    trigger.Start();
                });
            });
        });
    });
});

