const PubCommand = require('../../../PubCommand')
const { db } = require('../../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'remove',
            description: 'Remove a question from the queue.',
            // examples: ['remove 5 yes'],
            runIn: ['text'],
            examples: ['remove 5 yes'],
            usage: '<questionNr:integer> <confirm:boolean>',
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'IS_ORIGINAL_CREATOR', 'HAS_NOT_STARTED', 'HAS_QUESTIONS'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            cooldown: 1,

            // args: [
            //     {
            //         key: 'questionNr',
            //         label: 'question number',
            //         prompt: 'Which question do you want to remove from the queue? Use the list command to see all set questions.',
            //         type: 'integer'
            //     },
            //     {
            //         key: 'confirm',
            //         prompt: 'This will remove the question. Are you sure? Respond with `yes` or `no`.',
            //         type: 'string',
            //         oneOf: ['yes', 'no']
            //     }
            // ]
        });
    }

    async run (message, [questionNr, confirm]) {
        if (confirm) {
            const doesExist = await db.oneOrNone(`
                SELECT 1
                FROM pubquiz_questions
                WHERE pubquiz_uuid = $1
                    AND question_nr = $2;
            `, [message.resolved.pubquiz.pubquiz_uuid, questionNr])
            if (doesExist) {
                try {
                    db.none(`
                        DELETE FROM pubquiz_questions
                        WHERE pubquiz_uuid = $1
                            AND question_nr = $2;

                        UPDATE pubquiz_questions
                        SET question_nr = question_nr1
                        WHERE question_nr > $2;
                    `, [message.resolved.pubquiz.pubquiz_uuid, questionNr])
                    message.reply("Question **successfully removed** from the queue.")
                } catch (e) {
                    console.log(e)
                    message.reply("Something **went wrong** while trying to remove the question :/")
                }
            }
        } else {
            message.reply(`Question ${questionNr} **does not exist**.`)
        }
    }
}