const { Command } = require('klasa');
const { stopQuestion } = require('../../resume/watch_message')
const { db } = require('../../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'stop',
            aliases: ['lock'],
            description: 'Stop the quiz. This will lock the answers channels and end the question.',
            runIn: ['text'],
            usage: '<confirm:boolean>',

            // args: [
            //     {
            //         key: 'confirm',
            //         prompt: 'This will lock the answers channels and end the question. Are you sure? Respond with `yes` or `no`.',
            //         type: 'string',
            //         oneOf: ['yes', 'no']
            //     }
            // ]
        });
    }

    async run (message, [confirm]) {
        if (confirm) {
            const creatorId = message.author.id
            const channelId = message.channel.id
            const guildId = message.channel.guild.id

            const results = await db.oneOrNone(`
                SELECT *
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

            if (results) {
                if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                    if (results.has_started) {
                        if (!results.countdown_endtime) {
                            try {
                                const questionMessage = await message.guild.channels.cache.get(results.feed_channel_id).messages.fetch(results.question_message_id)

                                stopQuestion(questionMessage, {
                                    sessionUuid: results.session_uuid,
                                    questionNr: results.question_nr,
                                    creator: message.author
                                })

                                const participants = await db.any(`
                                    SELECT pubquiz_participants.participant_id, pubquiz_participants.answers_channel_id
                                    FROM pubquiz_participants
                                    INNER JOIN pubquiz_sessions
                                    ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
                                        AND pubquiz_sessions.session_uuid = $1;
                                `, [results.session_uuid])

                                participants.forEach(participant => {
                                    message.guild.channels.cache.get(participant.answers_channel_id).updateOverwrite(participant.participant_id, {
                                        SEND_MESSAGES: false
                                    })
                                });

                                db.none(`
                                    UPDATE pubquiz_sessions 
                                    SET is_active = false
                                    WHERE session_uuid = $1
                                `, [results.session_uuid])
                            } catch (e) {
                                console.log(e)
                                message.reply("Something went wrong while trying to stop/lock the Pubquiz :/")
                            }
                        } else {
                            message.reply(`There is an **ongoing timed question**. You **can't** manually stop it so please wait for it to finish.`)
                        }
                    } else {
                        message.reply(`The Pubquiz currently has **no active question**.`)
                    }
                } else {
                    message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
                }
            } else {
                message.reply("You **haven't created** a Pubquiz yet.")
            }
        }
    }
};