const { between } = require('../src/util');

describe('Utility Function Unit Test', () => {
	test('Between', () => {
		for(let i = 2; i < 10; i++) {
			expect(between(i, 1, 10, true, true)).toBe(true);
			expect(between(i, 1, 10, true, false)).toBe(true);
			expect(between(i, 1, 10, false, true)).toBe(true);
			expect(between(i, 1, 10, false, false)).toBe(true);
		}

		expect(between(1, 1, 10, true, true)).toBe(true);
		expect(between(1, 1, 10, true, false)).toBe(true);
		expect(between(1, 1, 10, false, true)).toBe(false);
		expect(between(1, 1, 10, false, false)).toBe(false);

		expect(between(10, 1, 10, true, true)).toBe(true);
		expect(between(10, 1, 10, true, false)).toBe(false);
		expect(between(10, 1, 10, false, true)).toBe(true);
		expect(between(10, 1, 10, false, false)).toBe(false);

		expect(between(-1, 1, 10, true, true)).toBe(false);
		expect(between(-1, 1, 10, true, false)).toBe(false);
		expect(between(-1, 1, 10, false, true)).toBe(false);
		expect(between(-1, 1, 10, false, false)).toBe(false);

		expect(between(11, 1, 10, true, true)).toBe(false);
		expect(between(11, 1, 10, true, false)).toBe(false);
		expect(between(11, 1, 10, false, true)).toBe(false);
		expect(between(11, 1, 10, false, false)).toBe(false);
	});
});