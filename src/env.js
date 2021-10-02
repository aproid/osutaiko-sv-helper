const path = require('path');

const __DEV__ = process.env.NODE_ENV === 'development';
const __TEST__ = process.env.NODE_ENV === 'test';
const __VERSION__ = process.env.npm_package_version;
const __DIR__ = __DEV__ || __TEST__ ? path.join(__dirname, '..') : process.env.PORTABLE_EXECUTABLE_DIR;

module.exports = {
	__DEV__,
	__TEST__,
	__VERSION__,
	__DIR__
};