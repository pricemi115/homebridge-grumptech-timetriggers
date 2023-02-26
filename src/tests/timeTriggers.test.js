/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import { TRIGGER_STATES, TRIGGER_EVENTS } from '../triggerTypes.mjs';
import {TimeTrigger} from '../timeTrigger.mjs';
import _is from 'is-it-check';

describe('Module-level tests', ()=>{
    test('Module TimeTriggers export expected value', ()=>{
        const timeTrigger = new TimeTrigger();
        expect(timeTrigger).toBeInstanceOf(TimeTrigger);
    });
});

describe('TimeTrigger class tests', ()=>{
    describe('Instance function/property valid tests', ()=>{
        let timeTrigger;
        beforeAll(()=>{
            timeTrigger = new TimeTrigger();
        });

        test('Start', ()=>{
            expect(timeTrigger).toHaveProperty('Start');
        });
        test('Stop', ()=>{
            expect(timeTrigger).toHaveProperty('Stop');
        });
        test('State', ()=>{
            expect(timeTrigger).toHaveProperty('State');
            expect(timeTrigger.State).toBe(TRIGGER_STATES.Inactive);
        });
        test('Identifier', ()=>{
            expect(timeTrigger).toHaveProperty('Identifier');
            expect(_is.string(timeTrigger.Identifier)).toBe(true);
            expect(timeTrigger.Identifier.length).toBe(36);
        });
        test('Timeout', ()=>{
            expect(timeTrigger).toHaveProperty('Timeout');
            // Setting of the timeout to a positive value is decoupled.
            expect(_is.positive(timeTrigger.Timeout)).toBe(false);
        });
        test('Duration', ()=>{
            expect(timeTrigger).toHaveProperty('Duration');
            // Setting of the duration to a positive value is decoupled.
            expect(_is.positive(timeTrigger.Duration)).toBe(false);
        });
    });
    describe('Instance function/property valid tests - part 2', ()=>{
        test('Valid config', ()=>{
            const id = 'pancakes';
            let trigEmpty = new TimeTrigger({});
            let trigId = new TimeTrigger({identifier: id});
            let trigWaffles = new TimeTrigger({waffles: id});
            let trigSignature = new TimeTrigger({signature: id});
            expect(_is.not.undefined(trigEmpty)).toBe(true);
            expect(_is.not.undefined(trigId)).toBe(true);
            expect(trigId.Identifier).not.toBe(id);
            expect(_is.not.undefined(trigWaffles)).toBe(true);
            expect(trigWaffles.Identifier).not.toBe(id);
            expect(trigWaffles.Name).toBe(trigWaffles.Signature.slice(0,6));
            expect(trigSignature.Signature).toBe(id);
            expect(trigSignature.Name).toBe(id);
        });
    });
    describe('Instance function/property invalid tests', ()=>{
        test('Invalid config', ()=>{
            function trigNumber() {
                const test = new TimeTrigger(7);
            };
            function trigString() {
                const test = new TimeTrigger('waffles');
            };
            function trigNegTimeout() {
                const test = new TimeTrigger({timeout: {min: -10, max: -10}});
            }
            function trigNegTripDurationt() {
                const test = new TimeTrigger({duration: {min: -10, max: -10}});
            }
            expect(trigNumber).toThrow(TypeError);
            expect(trigString).toThrow(TypeError);
            expect(trigNegTimeout).toThrow(RangeError);
            expect(trigNegTripDurationt).toThrow(RangeError);
        });
    });
    describe('Instance functionality tests', ()=>{
        let timeTrigger;
        let startTimestamp = 0;
        let error;
        describe.each([
            ['Default', {}],
            ['1 Sec',   {timeout: {min: 1000, max: 1000}}],
        ])('Start Tests.', (desc, config) =>{
            test(desc, done =>{
                function handlerStateChanged(e) {
                    try {
                        /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(timeTrigger.Identifier);

                        /* old_state */
                        expect(e).toHaveProperty('old_state');
                        expect(_is.sameType(e.old_state, TRIGGER_STATES.Inactive)).toBeTruthy();

                        /* new_state */
                        expect(e).toHaveProperty('new_state');
                        expect(_is.sameType(e.new_state, TRIGGER_STATES.Inactive)).toBeTruthy();

                        /* state changed */
                        expect((e.new_state !== e.old_state)).toBeTruthy();

                        /* Manage Trigger Life Cycle */
                        if ((e.old_state === TRIGGER_STATES.Triggered) &&
                            (e.new_state === TRIGGER_STATES.Armed)) {
                            // compute the measured timeout period.
                            const timeNow = Date.now();
                            const timeout = Date.now() - startTimestamp;
                            startTimestamp = timeNow;
                            // Stop the trigger after one cycle.
                            timeTrigger.Stop();

                            if (Math.abs(timeout - (timeTrigger.Timeout + timeTrigger.Duration)) > 10/*milliseconds*/) {
                                error = true;
                            }
                        }
                        if ((e.old_state === TRIGGER_STATES.Armed) &&
                            (e.new_state === TRIGGER_STATES.Inactive)) {
                            // Cleanup and end the test.
                            timeTrigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
                            done(error);
                        }
                    }
                    catch (error) {
                        // Abort the test.
                        console.log(`Aborting test.`);
                        console.log(error);
                        done(error);
                    }
                };

                // Initiate the trigger test.
                timeTrigger = new TimeTrigger(config);
                timeTrigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
                startTimestamp = Date.now();
                // Decouple the start.
                setImmediate(() => {
                    timeTrigger.Start();
                });
            });
        });
        test('Stop from idle', done =>{
            function handlerStateNotification(e) {
                try {
                    /* UUID */
                    expect(e).toHaveProperty('uuid');
                    expect(e.uuid).toBe(timeTrigger.Identifier);

                    /* current_state */
                    expect(e).toHaveProperty('current_state');
                    expect(_is.sameType(e.current_state, TRIGGER_STATES.Inactive)).toBeTruthy();
                    expect(e.current_state === TRIGGER_STATES.Inactive).toBeTruthy();

                    // Cleanup and end the test.
                    timeTrigger.off(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
                    done();
                }
                catch (error) {
                    // Abort the test.
                    console.log(`Aborting test.`);
                    console.log(error);
                    done(error);
                }
            };

            // Initiate the trigger test.
            timeTrigger = new TimeTrigger();
            timeTrigger.on(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotification);
            timeTrigger.Stop();
        });
        test('Stop from armed', done =>{
            function handlerStateChanged(e) {
                try {
                    /* UUID */
                    expect(e).toHaveProperty('uuid');
                    expect(e.uuid).toBe(timeTrigger.Identifier);

                    /* old_state */
                    expect(e).toHaveProperty('old_state');
                    expect(_is.sameType(e.old_state, TRIGGER_STATES.Inactive)).toBeTruthy();

                    /* new_state */
                    expect(e).toHaveProperty('new_state');
                    expect(_is.sameType(e.new_state, TRIGGER_STATES.Inactive)).toBeTruthy();

                    /* state changed */
                    expect((e.new_state !== e.old_state)).toBeTruthy();

                    /* Manage Trigger Life Cycle */
                    if (e.new_state === TRIGGER_STATES.Armed) {
                        // Set a timer to kill the trigger.
                        setTimeout(()=>{
                            // Abort the trigger.
                            timeTrigger.Stop();
                        }, 2500);
                    }
                    if ((e.old_state === TRIGGER_STATES.Armed) &&
                        (e.new_state === TRIGGER_STATES.Inactive)) {
                        // Cleanup and end the test.
                        timeTrigger.off(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
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

            // Initiate the trigger test.
            timeTrigger = new TimeTrigger();
            timeTrigger.on(TRIGGER_EVENTS.EVENT_STATE_CHANGED, handlerStateChanged);
            // Decouple the start.
            setImmediate(() => {
                timeTrigger.Start();
            });
        });
    });
});
