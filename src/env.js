
const __DEV__ = process.env.NODE_ENV === 'development';
const __TEST__ = process.env.NODE_ENV === 'test';
const __VERSION__ = process.env.npm_package_version;

module.exports = {
	__DEV__,
	__TEST__,
	__VERSION__
};