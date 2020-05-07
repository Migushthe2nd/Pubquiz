const { util: { isFunction } } = require('klasa');
const PubCommand = require('../../../PubCommand')
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

module.exports = class extends PubCommand {

	constructor(...args) {
		super(...args, {
			aliases: ['commands'],
			guarded: true,
			description: language => language.get('COMMAND_HELP_DESCRIPTION'),
			usage: '(Command:command)'
		});

		this.createCustomResolver('command', (arg, possible, message) => {
			if (!arg || arg === '') return undefined;
			return this.client.arguments.get('command').run(arg, possible, message);
		});
	}

	async run (message, [command]) {
		if (command) {
			const info = [
				`= ${command.name} = `,
				isFunction(command.description) ? command.description(message.language) : command.description,
				message.language.get('COMMAND_HELP_USAGE') + ' :: ' + command.usage.fullUsage(message),
				// message.language.get('COMMAND_HELP_EXTENDED'),
				command.examples && command.examples.length > 0 ? `${message.language.get('COMMAND_HELP_EXAMPLES')} ::\n${command.examples.map(i => ` - ${i}`).join('\n')}` : ''
			].join('\n');
			return message.sendMessage(info, { code: 'asciidoc' });
		}
		const help = await this.buildHelp(message);
		const categories = Object.keys(help);
		const { prefix } = message.guildSettings;
		const helpMessage = [];
		helpMessage.push(`**Prefix` + (message.guild !== null ? ` in ${message.guild.name}` : '') + `: \`${prefix}\`**`)
		for (let cat = 0; cat < categories.length; cat++) {
			helpMessage.push('\u200b');
			helpMessage.push(`**${categories[cat]} Commands**:`, '```asciidoc');
			const subCategories = Object.keys(help[categories[cat]]);
			for (let subCat = 0; subCat < subCategories.length; subCat++) helpMessage.push(`= ${subCategories[subCat]} =`, `${help[categories[cat]][subCategories[subCat]].join('\n')}\n`);
			helpMessage.push('```');
		}

		return message.author.send(helpMessage, { split: { char: '\u200b' } })
			.then(() => { if (message.channel.type !== 'dm') message.sendLocale('COMMAND_HELP_DM'); })
			.catch(() => { if (message.channel.type !== 'dm') message.sendLocale('COMMAND_HELP_NODM'); });
	}

	async buildHelp (message) {
		const help = {};

		const commandNames = [...this.client.commands.keys()];
		const longest = commandNames.reduce((long, str) => Math.max(long, str.length), 0);

		await Promise.all(this.client.commands.map((command) =>
			this.client.inhibitors.run(message, command, true)
				.then(() => {
					if (!has(help, command.category)) help[command.category] = {};
					if (!has(help[command.category], command.subCategory)) help[command.category][command.subCategory] = [];
					const description = isFunction(command.description) ? command.description(message.language) : command.description;
					help[command.category][command.subCategory].push(`${command.name.padEnd(longest)} :: ${description}`);
				})
				.catch(() => {
					// noop
				})
		));

		return help;
	}

};