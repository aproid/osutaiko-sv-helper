const { __DEV__, __TEST__ } = require('../src/env');

test('Run Environment Detecting Unit Test', () => {
	expect(__DEV__).toBe(false);
	expect(__TEST__).toBe(true);
});