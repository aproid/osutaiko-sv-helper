const Regex = require('./regex').default;

function parseIntSafely(value) {
	let cValue = parseInt(value, 10);

	if(Number.isNaN(cValue))
		throw new TypeError;

	return cValue;
}

function parseFloatSafely(value) {
	let cValue = parseFloat(value);

	if(Number.isNaN(cValue))
		throw new TypeError;

	return cValue;
}

function parseTimeSafely(time) {
	let cTime;

	if(Regex.TIME.test(time)) {
		cTime = timeToMillisecond(time);
	} else {
		cTime = parseInt(time);
	}

	if(Number.isNaN(cTime))
		throw new TypeError;

	return cTime;
}

function timeToMillisecond(time) {
	try {
		const matches = time.match(Regex.TIME);
		const [_, m, s, ms] = matches.map(v => parseInt(v));

		return ms + s * 1000 + m * 1000 * 60;
	} catch(e) {
		return NaN;
	}
}

module.exports = {
	parseIntSafely,
	parseFloatSafely,
	parseTimeSafely,
	timeToMillisecond
};