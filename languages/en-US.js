const { Language, util } = require('klasa');

module.exports = class extends Language {

    constructor(...args) {
        super(...args, {
            name: 'en-US',
            enabled: true
        });

        this.language = {
            // Resolvers (arguments)
            RESOLVER_INVALID_UUID: `That doesn't seem like a valid UUID. A UUID looks like this: \`e52cf51d-1ae1-417c-a42e-f7e096d07d21\``,
            RESOLVER_INVALID_IMAGE: `That doesn't seem like a valid image. Either send an image url or upload one.`,
            RESOLVER_INVALID_FORCE: `That doesn't seem to be 'force'`,
            // Commands:
            COMMANDMESSAGE_UNKNOWN: (prefix) => `Unknown command. Use \`${prefix} help\` to see all available options.`,
            COMMAND_HELP_USAGE: 'Usage',
            COMMAND_HELP_EXAMPLES: 'Examples',
            COMMAND_INFO: [
                '```asciidoc',
                'Pubquiz is a bot which can help organise pubquizzes in Discord servers.',
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
                'Found a bug or want to request a feature? Let me know: Migush#4096.',
                '',
                `Pubquiz V${this.client.config.version}`,
                '--------------```'
            ],
            COMMAND_INVITE: () => [
                `To add ${this.client.user.username} to your discord guild:`,
                `<https://discord.com/api/oauth2/authorize?client_id=703920658198954055&permissions=8&scope=bot>`
            ],
            COMMAND_CREATE_DESCRIPTION: `Create a new Pubquiz. Use \`help create\` to view all parameters.`,
            COMMAND_DELETE_DESCRIPTION: `Delete a Pubquiz by UUID. Active quizes will be stopped if forced. This will remove questions. If you wish to keep those, use the end command to end the Pubquiz. Only the original creator of the Pubquiz is able to use this command.`,
            COMMAND_END_DESCRIPTION: `Stop the quiz and remove all Pubquiz-related channels.`,
            COMMAND_FIX_DESCRIPTION: `You might have to use this command if you removed Pubquiz-related channels manually. If you are unable to create a Pubquiz, try this. This will try to remove all Pubquiz-related channels and data.`,
            COMMAND_START_DESCRIPTION: `Close participation and start the first question.`,
            COMMAND_STOP_DESCRIPTION: `Stop the quiz. This will lock the answers channels and end the question.`,
            COMMAND_ADD_DESCRIPTION: `Add a new question to the queue.`,
            COMMAND_EDIT_DESCRIPTION: `Edit a question in the queue.`,
            COMMAND_REMOVE_DESCRIPTION: `Remove a question from the queue.`,
            COMMAND_REMOVEALL_DESCRIPTION: `Remove all questions from the queue.`,
            COMMAND_IMPORT_DESCRIPTION: `Import questions from a spreadsheet. Columns: \`question\`, \`seconds\`, \`image url\``,
            COMMAND_LIST_DESCRIPTION: `Show all questions in the queue.`,
            COMMAND_NEXT_DESCRIPTION: `Start the next question.`,
            COMMAND_USE_DESCRIPTION: `Use questions from an existing Pubquiz. The current queue will be replaced with the new one! If you wish to go back, use this command again and specify the UUID I DM'ed you earlier.`,
            COMMAND_CLOSE_DESCRIPTION: `Close participation.`,
            COMMAND_HIDE_DESCRIPTION: `Hide the Pubquiz for non-participants.`,
            COMMAND_OPEN_DESCRIPTION: `Allow people to see and join the Pubquiz. This will send the join message in #feed.`,
            COMMAND_SHOW_DESCRIPTION: `Make the Pubquiz visible in the server.`,
            COMMAND_CLEARCHAT_DESCRIPTION: `Remove all messages in #feed or #controls depending on where you use it. Does not remove the join and help messages.`,
            COMMAND_SPECTATOR_DESCRIPTION: `Toggle spectator for a user. This will allow them to view the answers channels, unlike just keeping the Pubquiz visible.`,
            // Conditions:
            NO_ACTIVE_SESSION: `You **haven't created** a Pubquiz yet.`,
            ACTIVE_SESSION: (controlsChannel) => `You have **already created** a Pubquiz here: ${controlsChannel}. There can only be one created Pubquiz per user.`,
            IS_NOT_PARTICIPANT: `You **aren't** a participant yet.`,
            IS_PARTICIPANT: (feedChannel) => `You are **already participating** in a Pubquiz here: ${feedChannel}.`,
            INCORRECT_GUILD: (guild) => `You must use this command in ${guild}.`,
            NOT_CONTROLS_CHANNEL_OR_FEED_CHANNEL: (feedChannel, controlsChannel) => `You may only use this command in ${feedChannel} and ${controlsChannel}.`,
            NOT_CONTROLS_CHANNEL: (controlsChannel) => `You must use this command in ${controlsChannel}.`,
            HAS_NO_PARTICIPANTS: `The Pubquiz has **no participants** yet. Be sure to use the open command so people can join.`,
            HAS_NOT_STARTED: `The Pubquiz has **not been started** yet.`,
            HAS_STARTED: `The Pubquiz has **already been started**.`,
            IS_NOT_OPEN: `The Pubquiz is **still closed**.`,
            IS_OPEN: `The Pubquiz is **already open**.`,
            IS_ACTIVE_COUNTDOWN: `There is an **ongoing timed question**. You **can't** manually stop it so please wait for it to finish.`,
            IS_NOT_ORIGINAL_CREATOR: `You are **not the original creator** of this pubquiz, so you cannot modify the questions. In the future you may use the copy command to enable editing.`,
            HAS_NO_QUESTIONS: `The Pubquiz has **no questions** yet.`,
            QUESTION_NOT_EXISTS: (questionNr) => `Question ${questionNr} **does not exist** yet.`
        };
    }
};