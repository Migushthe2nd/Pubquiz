const { Language } = require('klasa');
const config = require('../config.json')

module.exports = class extends Language {

    constructor(...args) {
        super(...args, {
            name: 'en-US',
            enabled: true
        });

        this.language = {
            RESOLVER_INVALID_UUID: `That doesn't seem like a valid UUID. A UUID looks like this: \`e52cf51d-1ae1-417c-a42e-f7e096d07d21\``,
            RESOLVER_INVALID_IMAGE: `That doesn't seem like a valid image. Either send an image url or upload one.`,
            RESOLVER_INVALID_FORCE: `That doesn't seem to be 'force'`,
            COMMAND_HELP_EXAMPLES: 'Examples',
            COMMAND_HELP_USAGE: 'Usage',
            COMMAND_INFO: [
                '```asciidoc',
                'Pubquiz is a bot which can help organise pubquizes in Discord servers.',
                'Configured quizes are stored in a database and can be used multiple times by anyone if the creator shares the UUID.',
                '',
                'Planned features:',
                '• Create more categories if existing is full. (currently there\'s a limit of 48 participants.)',
                '• Allow copying a Pubquiz',
                '• Plan and announce a Pubquiz',
                '• Importing spreadsheets with questions',
                '• Question types (open, multiple choice)',
                '• Automatic multiple choice checking',
                '• Leaderboards',
                '',
                'Credits to Kaytjuh for the logo design.',
                '',
                'Found a bug or want to request a feature? Let me know: Migush#4096',
                '',
                `Pubquiz V${config.version}`,
                '------------```'
            ],
            COMMAND_CONF_RESET: (key, response) => `The key **${key}** has been reset to: \`${response}\``
        };
    }
};