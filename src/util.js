
function between(value, min, max, includingMin=true, includingMax=true) {
	return (min <= value && value <= max)
		&& (value !== min || includingMin)
		&& (value !== max || includingMax);
}

module.exports = {
	between
};