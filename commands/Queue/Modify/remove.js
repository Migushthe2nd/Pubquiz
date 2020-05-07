const { Command } = require('klasa');
const { db } = require('../../../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'remove',
            description: 'Remove a question from the queue.',
            // examples: ['remove 5 yes'],
            runIn: ['text'],
            extendedHelp: [' - remove 5 yes'].join('\n'),
            usage: '<questionNr:integer> <confirm:boolean>',
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
            const creatorId = message.author.id
            const guildId = message.channel.guild.id
            const channelId = message.channel.id

            const results = await db.oneOrNone(`
                SELECT *
                FROM pubquiz_sessions
                WHERE creator_id = $1
            `, [creatorId])

            if (results) {
                if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                    const pubquiz = await db.oneOrNone(`
                        SELECT *
                        FROM pubquiz
                        WHERE pubquiz_uuid = $1
                            AND creator_id = $2
                    `, [results.pubquiz_uuid, creatorId])
                    if (results.creator_id === pubquiz.creator_id) {
                        try {
                            db.none(`
                                DELETE FROM pubquiz_questions
                                WHERE pubquiz_uuid = $1
                                    AND question_nr = $2;

                                UPDATE pubquiz_questions
                                SET question_nr = question_nr - 1
                                WHERE question_nr > $2;
                            `, [results.pubquiz_uuid, questionNr])
                            message.reply("Question **successfully removed** from the queue.")
                        } catch (e) {
                            console.log(e)
                            message.reply("Something **went wrong** while trying to remove the question :/")
                        }
                    } else {
                        message.reply("You are **not the original creator** of this pubquiz, so you cannot modify the questions. You may use the copy command to enable editing.")
                    }
                } else {
                    message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
                }
            } else {
                message.reply("You **haven't created** a Pubquiz yet.")
            }
        }
    }
}