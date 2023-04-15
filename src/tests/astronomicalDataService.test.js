/* eslint-disable no-unused-vars */
/* eslint-disable indent */
/* eslint-disable brace-style */
/* eslint-disable semi */
/* eslint-disable new-cap */
import {AstronomicalData, ASTRONOMICAL_DATA_EVENTS} from '../astronomicalDataService.mjs';
import _is from 'is-it-check';

describe('Module-level tests', ()=>{
    test('Module TimeTriggers export expected value', ()=>{
        const astroData = new AstronomicalData();
        expect(astroData).toBeInstanceOf(AstronomicalData);
    });
});

describe('AstronomicalData class tests', ()=>{
    describe('Instance function/property valid tests', ()=>{
        let astroData;
        beforeAll(()=>{
            astroData = new AstronomicalData();
        });
        // API Tests
        test('RawData', ()=>{
            expect(astroData).toHaveProperty('RawData');
        });
        test('Valid', ()=>{
            expect(astroData).toHaveProperty('Valid');
            expect(astroData.Valid).toBe(false);
        });
        test('APIVersion', ()=>{
            expect(astroData).toHaveProperty('APIVersion');
        });
        test('Type', ()=>{
            expect(astroData).toHaveProperty('Type');
        });
        test('Latitude', ()=>{
            expect(astroData).toHaveProperty('Latitude');
        });
        test('Longitude', ()=>{
            expect(astroData).toHaveProperty('Longitude');
        });
        test('Date', ()=>{
            expect(astroData).toHaveProperty('Date');
        });
        test('LunarPhase', ()=>{
            expect(astroData).toHaveProperty('LunarPhase');
        });
        test('TwilightStart', ()=>{
            expect(astroData).toHaveProperty('TwilightStart');
        });
        test('TwilightEnd', ()=>{
            expect(astroData).toHaveProperty('TwilightEnd');
        });
        test('SolarRise', ()=>{
            expect(astroData).toHaveProperty('SolarRise');
        });
        test('SolarSet', ()=>{
            expect(astroData).toHaveProperty('SolarSet');
        });
        test('SolarTransit', ()=>{
            expect(astroData).toHaveProperty('SolarTransit');
        });
        test('LunarRise', ()=>{
            expect(astroData).toHaveProperty('LunarRise');
        });
        test('LunarSet', ()=>{
            expect(astroData).toHaveProperty('LunarSet');
        });
        test('LunarTransit', ()=>{
            expect(astroData).toHaveProperty('LunarTransit');
        });
        test('RequestAstronomicalOneDayData', ()=>{
            expect(astroData).toHaveProperty('RequestAstronomicalOneDayData');
        });
        test('CheckLocation', ()=>{
            expect(AstronomicalData).toHaveProperty('CheckLocation');
        });
    });
    describe('Instance function/property invalid tests', ()=>{
        test('Invalid config', ()=>{
            function astroNoLoc() {
                const test = AstronomicalData.CheckLocation();
            };
            function astroNoLoc2() {
                const test = AstronomicalData.CheckLocation({pancakes: {latitude: 42, longitude: -72}});
            };
            function astroBadLoc1() {
                const test = AstronomicalData.CheckLocation(7);
            };
            function astroBadLoc2() {
                const test = AstronomicalData.CheckLocation('waffles');
            };
            function astroNoLatitude() {
                const test = AstronomicalData.CheckLocation({location: {longitude: -72}});
            };
            function astroNoLongitude() {
                const test = AstronomicalData.CheckLocation({locatin: {latitude: 42}});
            };
            function astroLowLatitude() {
                const test = AstronomicalData.CheckLocation({location: {latitude: -91, longitude: -72}});
            };
            function astroHighLatitude() {
                const test = AstronomicalData.CheckLocation({location: {latitude: 91, longitude: -72}});
            };
            function astroLowLongitude() {
                const test = AstronomicalData.CheckLocation({location: {latitude: 42, longitude: -181}});
            };
            function astroHighLongitude() {
                const test = AstronomicalData.CheckLocation({location: {latitude: 42, longitude: 181}});
            };
            expect(astroNoLoc).toThrow(TypeError);
            expect(astroNoLoc2).toThrow(TypeError);
            expect(astroBadLoc1).toThrow(TypeError);
            expect(astroBadLoc2).toThrow(TypeError);
            expect(astroNoLatitude).toThrow(TypeError);
            expect(astroNoLongitude).toThrow(TypeError);
            expect(astroLowLatitude).toThrow(RangeError);
            expect(astroHighLatitude).toThrow(RangeError);
            expect(astroLowLongitude).toThrow(RangeError);
            expect(astroHighLongitude).toThrow(RangeError);
        });
    });

    describe('Astronomical Instance functionality tests', ()=>{
        describe.each([
            ['US_NorthEast-Today', {location: {latitude: 42, longitude: -71.25}}, true, new Date(), 'Point'],
            ['US_NorthEast-TodayAlt', {date: new Date(), location: {latitude: 42, longitude: -71.25}}, true, new Date(), 'Point'],
            ['US_SouthWest-Tomorrow', {date: new Date(Date.now() + (1.0*24.0*3600.0*1000.0)), location: {latitude: 33.5, longitude: -112.08}}, true, new Date(Date.now() + (1.0*24.0*3600.0*1000.0)), 'Point'],
            ['Germany-Yesterday', {date: new Date(Date.now() + (-1.0*24.0*3600.0*1000.0)), location: {latitude: 52.0, longitude: 12.0}}, true, new Date(Date.now() + (-1.0*24.0*3600.0*1000.0)), 'Point'],
            ['Austrailia-NextWeek', {date: new Date(Date.now() + (7.0*24.0*3600.0*1000.0)), location: {latitude: -30.0, longitude: 135.0}}, true, new Date(Date.now() + (7.0*24.0*3600.0*1000.0)), 'Point'],
        ])('Astro Tests.', (desc, config, expectedValid, expectedDate, expectedType) =>{
            test(desc, done =>{
                function handleDataProcessing(e) {
                    /* processing */
                    expect(e).toHaveProperty('processing');

                    processingNotifications.push(e.processing);

                    if (e.processing) {
                        // Valid
                        expect(astroData.Valid).toBe(false);
                    }
                }

                function handleDataComplete(e) {
                    /* status */
                    expect(e).toHaveProperty('status');

                    // Validate Processing Notifications
                    expect(processingNotifications).toHaveLength(2);
                    expect(processingNotifications).toEqual([true, false]);

                    // Valid
                    expect(astroData.Valid).toBe(expectedValid);

                    if (astroData.Valid) {
                        // Type
                        expect(astroData.Type).toBe(expectedType);

                        // Date
                        const date = astroData.Date;
                        const expDate = new Date(expectedDate.toDateString());
                        expect(date).toEqual(expDate);

                        // Latitude
                        expect(Math.abs(astroData.Latitude-config.location.latitude)).toBeLessThanOrEqual(0.001);

                        // Longitude
                        expect(Math.abs(astroData.Longitude-config.location.longitude)).toBeLessThanOrEqual(0.001);
                    }
                    else {
                        expect(astroData.Type).toBe(undefined);
                        expect(date).toBe(undefined);
                        expect(astroData.Latitude).toBe(undefined);
                        expect(astroData.Longitude).toBe(undefined);
                    }

                    done();
                };

                // Initiate the test.
                const processingNotifications = [];
                const astroData = new AstronomicalData();
                astroData.on(ASTRONOMICAL_DATA_EVENTS.EVENT_DATA_PROCESSING, handleDataProcessing);
                astroData.on(ASTRONOMICAL_DATA_EVENTS.EVENT_DATA_PROCESS_COMPLETE, handleDataComplete);
                // Decouple the start.
                setImmediate(() => {
                    astroData.RequestAstronomicalOneDayData(config);
                });
            });
        });
    });

});
