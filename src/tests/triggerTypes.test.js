/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import {TRIGGER_STATES, TRIGGER_DAYS, TRIGGER_EVENTS, TRIGGER_TYPES, ASTRONOMICAL_TRIGGERS, TIME_OFFSET_TYPES} from '../triggerTypes.mjs';
import _is from 'is-it-check';

describe('Module-level tests', ()=>{
    test('Module Enumerations export expected value', ()=>{
        expect(TRIGGER_STATES).toBeInstanceOf(Object);
        expect(TRIGGER_DAYS).toBeInstanceOf(Object);
        expect(TRIGGER_EVENTS).toBeInstanceOf(Object);
        expect(TRIGGER_TYPES).toBeInstanceOf(Object);
        expect(ASTRONOMICAL_TRIGGERS).toBeInstanceOf(Object);
    });

    describe('Module TRIGGER_TYPES expected value(s)', ()=>{
        test('TRIGGER_TYPES size test', ()=>{
            expect(Object.values(TRIGGER_TYPES).length).toBe(2);
        });
        describe.each([
            ['Timed',  'TimedTrigger', 0],
            ['Scheduled',  'ScheduledTrigger',     1],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(TRIGGER_TYPES).toHaveProperty(input, result);
            });
        });
    });

    describe('Module TRIGGER_STATES expected value(s)', ()=>{
        test('TRIGGER_EVENTS size test', ()=>{
            expect(Object.values(TRIGGER_STATES).length).toBe(4);
        });
        describe.each([
            ['Inactive', 'Inactive', 0],
            ['Arming',   'Arming',   1],
            ['Armed',    'Armed',    2],
            ['Tripped',  'Tripped',  3],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(TRIGGER_STATES).toHaveProperty(input, result);
            });
        });
    });

    describe('Module TRIGGER_DAYS expected value(s)', ()=>{
        test('TRIGGER_DAYS size test', ()=>{
            expect(Object.values(TRIGGER_DAYS).length).toBe(10);
        });
        describe.each([
            ['Sunday',    'Sunday',      1],
            ['Monday',    'Monday',      2],
            ['Tuesday',   'Tuesday',     4],
            ['Wednesday', 'Wednesday',   8],
            ['Thursday',  'Thursday',   16],
            ['Friday',    'Friday',     32],
            ['Saturday',  'Saturday',   64],
            ['Weekday',   'Weekday',    62],
            ['Weekend',   'Weekend',    65],
            ['All Days',  'AllDays',   127],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(TRIGGER_DAYS).toHaveProperty(input, result);
            });
        });
    });

    describe('Module TRIGGER_EVENTS expected value(s)', ()=>{
        test('TRIGGER_EVENTS size test', ()=>{
            expect(Object.values(TRIGGER_EVENTS).length).toBe(2);
        });
        describe.each([
            ['EVENT_STATE_CHANGED', 'EVENT_STATE_CHANGED', 'state_changed'],
            ['EVENT_STATE_NOTIFY',  'EVENT_STATE_NOTIFY',  'state_notify'],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(TRIGGER_EVENTS).toHaveProperty(input, result);
            });
        });
    });

    describe('Module TIME_OFFSET_TYPES expected value(s)', ()=>{
        test('TIME_OFFSET_TYPES size test', ()=>{
            expect(Object.values(TIME_OFFSET_TYPES).length).toBe(3);
        });
        describe.each([
            ['TYPE_NONE',   'TYPE_NONE',    'none'],
            ['TYPE_BEFORE', 'TYPE_BEFORE',  'before'],
            ['TYPE_AFTER',  'TYPE_AFTER',   'after'],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(TIME_OFFSET_TYPES).toHaveProperty(input, result);
            });
        });
    });

    describe('Module ASTRONOMICAL_TRIGGERS expected value(s)', ()=>{
        test('ASTRONOMICAL_TRIGGERS size test', ()=>{
            expect(Object.values(ASTRONOMICAL_TRIGGERS).length).toBe(8);
        });
        describe.each([
            ['ASTRONOMICAL_TWILIGHT_START', 'ASTRONOMICAL_TWILIGHT_START', 'twilight_start'],
            ['ASTRONOMICAL_SUNRISE',        'ASTRONOMICAL_SUNRISE',         'sunrise'],
            ['ASTRONOMICAL_SOALAR_TRANSIT', 'ASTRONOMICAL_SOALAR_TRANSIT',  'solar_transit'],
            ['ASTRONOMICAL_SUNSET',         'ASTRONOMICAL_SUNSET',          'sunset'],
            ['ASTRONOMICAL_TWILIGHT_END',   'ASTRONOMICAL_TWILIGHT_END',    'twilight_end'],
            ['ASTRONOMICAL_MOON_RISE',      'ASTRONOMICAL_MOON_RISE',       'moon_rise'],
            ['ASTRONOMICAL_LUNAR_TRANSIT',  'ASTRONOMICAL_LUNAR_TRANSIT',   'lunar_transit'],
            ['ASTRONOMICAL_MOON_SET',       'ASTRONOMICAL_MOON_SET',        'moon_set'],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(ASTRONOMICAL_TRIGGERS).toHaveProperty(input, result);
            });
        });
    });
});