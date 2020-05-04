const { Argument } = require('klasa');
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = class extends Argument {

    async run (arg, possible, message) {
        if (REGEX_UUID.test(arg)) return REGEX_UUID.exec(arg)[0]
        throw message.language.get('RESOLVER_INVALID_UUID', possible.name)
    }

};