const path = require('path');

const { __DEV__, __TEST__ } = require('../src/env');

test('Run Environment Detecting Unit Test', () => {
	expect(__DEV__).toBe(false);
	expect(__TEST__).toBe(true);

	let { __DIR__ } = require('../src/env');

	expect(__DIR__).toBe(path.join(__dirname, '..'));

	process.env.NODE_ENV = 'production';
	process.env.PORTABLE_EXECUTABLE_DIR = __dirname;

	jest.resetModules();

	__DIR__ = require('../src/env').__DIR__;

	expect(__DIR__).toBe(__dirname);
});