const commando = require('discord.js-commando');
const regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/

let imageUrl = null

module.exports = class UrlArgumentType extends commando.ArgumentType {
	constructor(client) {
		super(client, 'url');
	}

	async validate (val, msg) {
		if (val === 'default' ? true : regexp.test(val)) {
			return true
		} else {
			const last = await msg.channel.messages.fetch(msg.author.lastMessageID)
			if (last.attachments.size > 0 && last.attachments.array()[0].url) {
				imageUrl = last.attachments.array()[0].url
				return true
			} else return false
		}
	}

	parse (val, msg) {
		if (val === 'default')
			return val
		else
			return regexp.exec(imageUrl ? imageUrl : val)[0];
	}
}