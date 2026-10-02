import {jest} from '@jest/globals';
import * as SunCalc from 'suncalc';
import {ScheduledTrigger} from '../scheduledTrigger.mjs';
import {ASTRONOMICAL_TRIGGERS, TIME_OFFSET_TYPES, TRIGGER_STATES} from '../triggerTypes.mjs';

describe('SunCalc fallback scheduling', () => {
    let trigger;
    let processListeners;
    const location = {latitude: 38.7223, longitude: -9.1393};

    beforeEach(() => {
        processListeners = new Map(['exit', 'uncaughtException'].map((event) =>
            [event, new Set(process.listeners(event))]));
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 9, 2, 0, 0, 0));
    });

    afterEach(() => {
        trigger?.Stop();
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
        for (const [event, original] of processListeners) {
            for (const listener of process.listeners(event)) {
                if (!original.has(listener)) process.removeListener(event, listener);
            }
        }
    });

    async function createTrigger(type = ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET,
        offset = {type: TIME_OFFSET_TYPES.TYPE_NONE, hour: 0, minute: 0},
        coordinates = location) {
        trigger = new ScheduledTrigger({
            astronomical_type: type,
            location: coordinates,
            time: {
                nominal: {hour: 12, minute: 0},
                tolerance: {hour: 0, minute: 0},
                astronomical_offset: offset,
            },
        });
        await jest.advanceTimersByTimeAsync(10);
        return jest.spyOn(trigger._astroHelper, 'RequestAstronomicalOneDayData');
    }

    function respondWith(request, response) {
        request.mockImplementation(() => {
            setImmediate(() => trigger._processAstronomicalResults(response));
        });
    }

    function localEvent(date, property = 'sunset') {
        return SunCalc.getTimes(date, location.latitude, location.longitude,
            0, -date.getTimezoneOffset())[property];
    }

    function expectScheduledAt(date) {
        const expected = new Date(date);
        expected.setSeconds(0, 0);
        expect(trigger.State).toBe(TRIGGER_STATES.Armed);
        expect(Math.abs(trigger._expectedTripTime.getTime() - expected.getTime())).toBeLessThan(10);
    }

    test.each([
        {status: true},
        undefined,
        {},
        {status: false},
        {status: false, data: {valid: false}},
    ])('schedules local sunset when USNO returns %j', async (response) => {
        const request = await createTrigger();
        respondWith(request, response);
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expectScheduledAt(localEvent(new Date()));
        expect(trigger._time.nominal.hour).not.toBe(12);
    });

    test('keeps valid USNO results as the primary source', async () => {
        const request = await createTrigger();
        const sunset = new Date(2026, 9, 2, 18, 23);
        const fallback = jest.spyOn(trigger, '_calculateLocalAstronomicalData');
        respondWith(request, {status: false, data: {
            valid: true, date: new Date(), solar_set: sunset,
        }});
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expectScheduledAt(sunset);
        expect(fallback).not.toHaveBeenCalled();
    });

    test('applies the configured offset to local sunset', async () => {
        const request = await createTrigger(ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET,
            {type: TIME_OFFSET_TYPES.TYPE_BEFORE, hour: 0, minute: 30});
        respondWith(request, {status: true});
        const sunset = localEvent(new Date());
        sunset.setMinutes(sunset.getMinutes() - 30);
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expectScheduledAt(sunset);
    });

    test('recalculates for tomorrow when today\'s sunset has passed', async () => {
        jest.setSystemTime(new Date(2026, 9, 2, 23, 0));
        const request = await createTrigger();
        respondWith(request, {status: true});
        trigger.Start();
        await jest.advanceTimersByTimeAsync(20);
        const tomorrow = new Date(2026, 9, 3, 12);
        expectScheduledAt(localEvent(tomorrow));
        expect(request).toHaveBeenCalledTimes(2);
        expect(request.mock.calls[1][0].date.getDate()).toBe(3);
    });

    test('does not arm at noon when sunset does not occur', async () => {
        jest.setSystemTime(new Date(2026, 5, 21, 0, 0));
        const request = await createTrigger(ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNSET,
            undefined, {latitude: 89, longitude: 0});
        respondWith(request, {status: true});
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expect(trigger.State).toBe(TRIGGER_STATES.Inactive);
        expect(trigger.Timeout).toBeLessThan(0);
    });

    test('remains inactive if local calculation fails', async () => {
        const request = await createTrigger();
        jest.spyOn(trigger, '_calculateLocalAstronomicalData').mockImplementation(() => {
            throw new Error('Calculation failed');
        });
        respondWith(request, {status: true});
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expect(trigger.State).toBe(TRIGGER_STATES.Inactive);
        expect(trigger.Timeout).toBeLessThan(0);
    });

    test.each([null, new Date(NaN), undefined])(
        'does not schedule a missing or invalid provider event: %s', async (sunset) => {
            const request = await createTrigger();
            respondWith(request, {status: false, data: {
                valid: true, date: new Date(), solar_set: sunset,
            }});
            trigger.Start();
            await jest.advanceTimersByTimeAsync(10);
            expect(trigger.State).toBe(TRIGGER_STATES.Inactive);
        });

    test('recalculates across the Lisbon daylight saving transition', async () => {
        jest.setSystemTime(new Date(2026, 9, 24, 23, 0));
        const request = await createTrigger();
        respondWith(request, {status: true});
        trigger.Start();
        await jest.advanceTimersByTimeAsync(20);
        expectScheduledAt(localEvent(new Date(2026, 9, 25, 12)));
        expect(request).toHaveBeenCalledTimes(2);
    });

    test.each([
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_START, 'dawn'],
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SUNRISE, 'sunrise'],
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_SOALAR_TRANSIT, 'solarNoon'],
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_TWILIGHT_END, 'dusk'],
    ])('maps solar event %s to %s', async (type, property) => {
        const request = await createTrigger(type);
        respondWith(request, {status: true});
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expectScheduledAt(localEvent(new Date(), property));
    });

    test.each([
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_RISE, 'rise'],
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_MOON_SET, 'set'],
        [ASTRONOMICAL_TRIGGERS.ASTRONOMICAL_LUNAR_TRANSIT, 'transit'],
    ])('maps lunar event %s to %s', async (type, property) => {
        const request = await createTrigger(type);
        respondWith(request, {status: true});
        const date = new Date();
        const moon = SunCalc.getMoonTimes(date, location.latitude, location.longitude,
            -date.getTimezoneOffset());
        expect(moon[property]).toBeInstanceOf(Date);
        trigger.Start();
        await jest.advanceTimersByTimeAsync(10);
        expectScheduledAt(moon[property]);
    });
});
