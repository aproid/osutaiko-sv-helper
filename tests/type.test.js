const { parseIntSafely, parseFloatSafely, parseTimeSafely, timeToMillisecond } = require('../src/type');

describe('Custom Type Caster Unit Test', () => {
	test('Parse Int Safely', () => {
		expect(parseIntSafely('100')).toBe(100);
		expect(() => parseIntSafely('test')).toThrow();
	});

	test('Parse Float Safely', () => {
		expect(parseFloatSafely('1')).toBe(1);
		expect(parseFloatSafely('1.1')).toBe(1.1);
		expect(parseFloatSafely('1e-1')).toBe(0.1);
		expect(() => parseFloatSafely('test')).toThrow();
	});

	test('Parse Time To Millisecond', () => {
		expect(timeToMillisecond('12:34:567')).toBe(754567);
		expect(timeToMillisecond('-1:-1:-1')).toBeNaN();
		expect(timeToMillisecond('test')).toBeNaN();
	});

	test('Parse Time Safely', () => {
		expect(parseTimeSafely('12:34:567')).toBe(754567);
		expect(() => parseTimeSafely('test')).toThrow();
	});
});