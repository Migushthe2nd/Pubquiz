const commando = require('discord.js-commando');

function isUuid (val) {
	var regexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
	return regexp.test(val);
}

module.exports = class UrlArgumentType extends commando.ArgumentType {
	constructor(client) {
		super(client, 'uuid');
	}

	validate (val) {
		return isUuid(val);
	}

	parse (val) {
		return val;
	}
}