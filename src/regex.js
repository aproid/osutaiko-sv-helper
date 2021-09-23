
const Regex = Object.freeze({
	TIME: /^([\d]{2})\:([\d]{2})\:([\d]{3})/,
	NEWLINE: /\r?\n/
});

module.exports = {
	default: Regex,
	Regex
};