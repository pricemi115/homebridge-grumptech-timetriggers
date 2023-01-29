/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import {TRIGGER_STATES} from '../triggerTypes.mjs';
import _is from 'is-it-check';

describe('Module-level tests', ()=>{
    test('Module Enumerations export expected value', ()=>{
        expect(TRIGGER_STATES).toBeInstanceOf(Object);
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
});