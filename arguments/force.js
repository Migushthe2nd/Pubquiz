const { Argument } = require('klasa');

module.exports = class extends Argument {

	constructor(...args) {
		super(...args);
	}

	run (arg, possible, message) {
		const forceArg = String(arg).toLowerCase();
		if (forceArg === 'force') return 'force'
		throw message.language.get('RESOLVER_INVALID_FORCE', possible.name);
	}

};
