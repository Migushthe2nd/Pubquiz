const { util: { isFunction } } = require('klasa');
const PubCommand = require('../PubCommand')
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'test',
            permissionLevel: 10,
            guarded: true,
            description: 'Test everything in this command',
            runIn: ['text'],
            enabled: false

            // args: [
            // 	{
            // 		key: 'title',
            // 		prompt: 'What title should this Pubquiz have? Respond with `default` for the default value (<name>\'s Pubquiz).',
            // 		type: 'string'
            // 	},
            // 	{
            // 		key: 'description',
            // 		prompt: 'How do you want to describe this Pubquiz? Respond with `default` for the default value (none).',
            // 		type: 'string'
            // 	},
            // 	{
            //         key: 'image',
            //         label: 'image url or upload',
            //         prompt: 'Do you want to show an image in the Pubquiz details? If so, send the url or upload an image, else respond with `default` to leave empty.',
            //         type: 'url',
            //         wait: 60
            // 	}
            // ]
        });

        // this.definePrompt('<title:string{,50}>', 'VUl het iN!')
    }

    async run (message) {
        const help = await this.buildHelp(message)

        const categories = Object.keys(help);
        const { prefix } = message.guildSettings;
        const helpMessage = [];

        helpMessage.push(`**Prefix` + (message.guild !== null ? ` in ${message.guild.name}` : '') + `: \`${prefix}\`**`)
        for (let cat = 0; cat < categories.length; cat++) {
            helpMessage.push('\u200b');
            helpMessage.push(`**${categories[cat]} Commands**:`, '```asciidoc');
            const subCategories = Object.keys(help[categories[cat]]);
            for (let subCat = 0; subCat < subCategories.length; subCat++) helpMessage.push(`= ${subCategories[subCat]} =`, `${help[categories[cat]][subCategories[subCat]]}\n`);
            helpMessage.push('```');
        }

        message.sendMessage(helpMessage, { split: { char: '\u200b' } })
    }

    async buildHelp (message) {
        const help = {};

        const commandNames = [...this.client.commands.keys()];
        const longest = commandNames.reduce((long, str) => Math.max(long, str.length), 0);

        await Promise.all(this.client.commands.map((command) =>
            this.client.inhibitors.run(message, command, true)
                .then(() => {
                    if (command.category === 'Admin' || command.category === 'General') return;
                    if (!has(help, command.category)) help[command.category] = {};
                    if (!has(help[command.category], command.subCategory)) help[command.category][command.subCategory] = [];
                    const description = isFunction(command.description) ? command.description(message.language) : command.description;
                    help[command.category][command.subCategory].push(`${command.name.padEnd(longest)} :: ${description}`);
                    if (!isFunction(command.examples)) help[command.category][command.subCategory].push('Examples:', command.examples)

                })
                .catch(() => {
                    // noop
                })
        ));

        return help;
    }

};