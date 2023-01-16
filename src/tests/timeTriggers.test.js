/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import * as _modTimeTriggers from '../timeTrigger.mjs';
import _is from 'is-it-check';

describe('Module-level tests', ()=>{
    test('Module TimeTriggers export expected value', ()=>{
        const timeTrigger = new _modTimeTriggers.TimeTrigger();
        expect(timeTrigger).toBeInstanceOf(_modTimeTriggers.TimeTrigger);
    });
    test('Module Enumerations export expected value', ()=>{
        expect(_modTimeTriggers.TIME_TRIGGER_EVENTS).toBeInstanceOf(Object);
        expect(_modTimeTriggers.TRIGGER_STATES).toBeInstanceOf(Object);
    });

    describe('Module TIME_TRIGGER_EVENTS expected value(s)', ()=>{
        test('TIME_TRIGGER_EVENTS size test', ()=>{
            expect(Object.values(_modTimeTriggers.TIME_TRIGGER_EVENTS).length).toBe(1);
        });
        describe.each([
            ['EVENT_STATE_CHANGED', 'EVENT_STATE_CHANGED', 'state_changed'],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(_modTimeTriggers.TIME_TRIGGER_EVENTS).toHaveProperty(input, result);
            });
        });
    });

    describe('Module TRIGGER_STATES expected value(s)', ()=>{
        test('TIME_TRIGGER_EVENTS size test', ()=>{
            expect(Object.values(_modTimeTriggers.TRIGGER_STATES).length).toBe(3);
        });
        describe.each([
            ['Inactive', 'Inactive',   0],
            ['Armed',     'Armed',     1],
            ['Triggered', 'Triggered', 2],
        ])('Enumeration exists.', (desc, input, result) =>{
            test(desc, ()=>{
                expect(_modTimeTriggers.TRIGGER_STATES).toHaveProperty(input, result);
            });
        });
    });
});

describe('TimeTrigger class tests', ()=>{
    describe('Instance function/property valid tests', ()=>{
        let timeTrigger;
        beforeAll(()=>{
            timeTrigger = new _modTimeTriggers.TimeTrigger();
        });

        test('Start', ()=>{
            expect(timeTrigger).toHaveProperty('Start');
        });
        test('Stop', ()=>{
            expect(timeTrigger).toHaveProperty('Start');
        });
        test('State', ()=>{
            expect(timeTrigger).toHaveProperty('State');
            expect(timeTrigger.State).toBe(_modTimeTriggers.TRIGGER_STATES.Inactive);
        });
        test('Identifier', ()=>{
            expect(timeTrigger).toHaveProperty('Identifier');
            expect(_is.string(timeTrigger.Identifier)).toBe(true);
            expect(timeTrigger.Identifier.length).toBe(36);
        });
    });
    describe('Instance function/property valid tests - part 2', ()=>{
        test('Valid config', ()=>{
            const id = 'pancakes';
            let trigEmpty = new _modTimeTriggers.TimeTrigger({});
            let trigId = new _modTimeTriggers.TimeTrigger({identifier: id});
            let trigWaffles = new _modTimeTriggers.TimeTrigger({waffles: id});
            expect(_is.not.undefined(trigEmpty)).toBe(true);
            expect(_is.not.undefined(trigId)).toBe(true);
            expect(trigId.Identifier).toBe(id);
            expect(_is.not.undefined(trigWaffles)).toBe(true);
            expect(trigWaffles.Identifier).not.toBe(id);
        });
    });
    describe('Instance function/property invalid tests', ()=>{
        test('Invalid config', ()=>{
            function trigNumber() {
                const test = _modTimeTriggers.TimeTrigger(7);
            };
            function trigString() {
                const test = _modTimeTriggers.TimeTrigger('waffles');
            };
            expect(trigNumber).toThrow(TypeError);
            expect(trigString).toThrow(TypeError);
        });
    });
});
