
const __DEV__ = process.env.NODE_ENV === 'development';
const __TEST__ = process.env.NODE_ENV === 'test';

module.exports = {
	__DEV__,
	__TEST__
};