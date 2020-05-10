const PubCommand = require('../../../PubCommand')
const { db } = require('../../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'removeall',
            description: language => language.get('COMMAND_REMOVEALL_DESCRIPTION'),
            runIn: ['text'],
            usage: '<confirm:boolean>',
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'IS_ORIGINAL_CREATOR', 'HAS_NOT_STARTED', 'HAS_QUESTIONS'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            cooldown: 10,

            // args: [
            //     {
            //         key: 'confirm',
            //         prompt: 'This will remove all questions. Are you sure? Respond with `yes` or `no`.',
            //         type: 'string',
            //         oneOf: ['yes', 'no']
            //     }
            // ]
        });
    }

    async run (message, [confirm]) {
        if (confirm) {
            try {
                db.none(`
                    DELETE FROM pubquiz_questions
                    WHERE pubquiz_uuid = $1;
                `, [message.resolved.pubquiz.pubquiz_uuid])
            } catch (e) {
                console.log(e)
                message.reply("Something **went wrong** while trying to delete all messages :/")
            }
        }
    }
};