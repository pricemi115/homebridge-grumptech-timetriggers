/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import { TRIGGER_STATES, TRIGGER_DAYS, TRIGGER_EVENTS } from '../triggerTypes.mjs';
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
                const test = new ScheduledTrigger({time: {min: 'waffles'}});
            }
            function trigInvalidTime4() {
                const test = new ScheduledTrigger({time: {max: true}});
            }
            function trigInvalidTimeLowMinHour() {
                const test = new ScheduledTrigger({time: {min: {hour: -1, minute: 0}, max: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeLowMinMinute() {
                const test = new ScheduledTrigger({time: {min: {hour: 5, minute: -1}, max: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeHighMinHour() {
                const test = new ScheduledTrigger({time: {min: {hour: 24, minute: 0}, max: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeHighMinMinute() {
                const test = new ScheduledTrigger({time: {min: {hour: 5, minute: 61}, max: {hour: 10, minute: 0}}});
            }
            function trigInvalidTimeLowMaxHour() {
                const test = new ScheduledTrigger({time: {min: {hour: 7, minute: 0}, max: {hour: -1, minute: 0}}});
            }
            function trigInvalidTimeLowMaxMinute() {
                const test = new ScheduledTrigger({time: {min: {hour: 5, minute: 7}, max: {hour: 10, minute: -1}}});
            }
            function trigInvalidTimeHighMaxHour() {
                const test = new ScheduledTrigger({time: {min: {hour: 15, minute: 0}, max: {hour: 24, minute: 0}}});
            }
            function trigInvalidTimeHighMaxMinute() {
                const test = new ScheduledTrigger({time: {min: {hour: 5, minute: 45}, max: {hour: 10, minute: 61}}});
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
    describe('Instance functionality tests', ()=>{
        describe.each([
            ['Pre Window',  {minOffset:  1, maxOffset:  2}, 0, TRIGGER_DAYS.AllDays],
            ['Mid Window',  {minOffset: -1, maxOffset:  2}, 0, TRIGGER_DAYS.AllDays],
            ['Post Window', {minOffset: -2, maxOffset: -1}, 0, TRIGGER_DAYS.AllDays],
            ['Next Week',   {minOffset: -2, maxOffset: -1}, 6, 0],
        ])('Trigger Window Tests.', (desc, offsets, deltaDays, additionalDays) =>{
            test(desc, done =>{
                function handlerStateNotify(e) {
                    try {
                       /* UUID */
                        expect(e).toHaveProperty('uuid');
                        expect(e.uuid).toBe(trigger.Identifier);

                        const timeout = trigger.Timeout;
                        expect(timeout).toBeGreaterThanOrEqual(0.995*expectedMin);
                        expect(timeout).toBeLessThanOrEqual(1.005*expectedMax);

                        done();
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
                minWindow.setMinutes(0);
                minWindow.setSeconds(0);
                minWindow.setMilliseconds(0);
                const maxWindow = new Date(now);
                maxWindow.setMinutes(0);
                maxWindow.setSeconds(0);
                maxWindow.setMilliseconds(0);

                // Initiate the trigger test.
                minWindow.setHours(minWindow.getHours() + offsets.minOffset);
                maxWindow.setHours(maxWindow.getHours() + offsets.maxOffset);

                const todayDay = now.getDay();
                const targetDay = ((todayDay + deltaDays) % DAYS_IN_WEEK);
                const triggerDay = (1<<targetDay);

                let expectedMin = minWindow - now;
                let expectedMax = maxWindow - now;
                if (expectedMin < 0) {
                    if (expectedMax >= 0) {
                        expectedMin = 0;
                    }
                    else {
                        let dayOffset = 1;
                        let test = (((todayDay+1) << 1) & TRIGGER_DAYS.AllDays);
                        if (test == 0) {
                            test = TRIGGER_DAYS.Sunday;
                        }
                        const mask = (triggerDay | additionalDays);
                        while ((test & mask) === 0) {
                            dayOffset++;
                            test = (test << 1);
                            if (test == 0) {
                                test = TRIGGER_DAYS.Sunday;
                            }
                        }

                        expectedMin += ((dayOffset*24.0)*3600.0*1000.0);
                        expectedMax += ((dayOffset*24.0)*3600.0*1000.0);
                    }
                }

                let config = {days: (triggerDay  | additionalDays), time: {min: {hour: minWindow.getHours(), minute: 0}, max: {hour: maxWindow.getHours(), minute: 0}}};
                const trigger = new ScheduledTrigger(config);
                trigger.on(TRIGGER_EVENTS.EVENT_STATE_NOTIFY, handlerStateNotify);
            });
        });
    });
});

