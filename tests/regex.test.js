const Regex = require('../src/regex').default;

describe('Regular Expression Module Unit Test', () => {
	test('Time Format', () => {
		expect(Regex.TIME.test('00:00:010')).toBe(true);
		expect(Regex.TIME.test('00:00:010 -')).toBe(true);
		expect(Regex.TIME.test('00:00:010 (1) -')).toBe(true);

		expect(Regex.TIME.test('1000')).toBe(false);
		expect(Regex.TIME.test('00:00:01')).toBe(false);
		expect(Regex.TIME.test('00:00:01 -')).toBe(false);
		expect(Regex.TIME.test('00:00:01 (1) -')).toBe(false);
	});

	test('New Line', () => {
		expect(Regex.NEWLINE.test('\r\n')).toBe(true);
		expect(Regex.NEWLINE.test('\n')).toBe(true);
		expect(Regex.NEWLINE.test('\r')).toBe(false);
	});
});