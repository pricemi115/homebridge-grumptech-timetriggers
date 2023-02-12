/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import {TRIGGER_STATES, TRIGGER_DAYS, TRIGGER_EVENTS} from '../triggerTypes.mjs';
import _is from 'is-it-check';

describe('Module-level tests', ()=>{
    test('Module Enumerations export expected value', ()=>{
        expect(TRIGGER_STATES).toBeInstanceOf(Object);
        expect(TRIGGER_DAYS).toBeInstanceOf(Object);
        expect(TRIGGER_EVENTS).toBeInstanceOf(Object);
    });

    describe('Module TRIGGER_STATES expected value(s)', ()=>{
        test('TRIGGER_EVENTS size test', ()=>{
            expect(Object.values(TRIGGER_STATES).length).toBe(3);
        });
        describe.each([
            ['Inactive',  'Inactive',  0],
            ['Armed',     'Armed',     1],
            ['Triggered', 'Triggered', 2],
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
});