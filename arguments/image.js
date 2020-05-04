const { Argument } = require('klasa');
const REGEX_IMAGE = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;

module.exports = class extends Argument {

    async run (arg, possible, message) {
        const lastMessage = await message.channel.messages.fetch(message.author.lastMessageID)

        if (REGEX_IMAGE.test(arg)) {
            return REGEX_IMAGE.exec(arg)[0];
        } else if (lastMessage.attachments.size > 0 && lastMessage.attachments.array()[0].url) {
            return lastMessage.attachments.array()[0].url
        } else {
            throw message.language.get('RESOLVER_INVALID_IMAGE', possible.name);
        }
    }

};