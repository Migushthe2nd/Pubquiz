const PubCommand = require('../../PubCommand')
const { stopQuestion } = require('../../resume/watch_message')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'stop',
            aliases: ['lock'],
            description: 'Stop the quiz. This will lock the answers channels and end the question.',
            runIn: ['text'],
            usage: '<confirm:boolean>',
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'HAS_STARTED', 'IS_NOT_ACTIVE_COUNTDOWN'],
            cooldown: 1,

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
            try {
                const questionMessage = await message.guild.channels.cache.get(message.resolved.session.feed_channel_id).messages.fetch(message.resolved.session.question_message_id)

                stopQuestion(questionMessage, {
                    sessionUuid: message.resolved.session.session_uuid,
                    questionNr: message.resolved.session.question_nr,
                    creator: message.author
                })

                const participants = await db.any(`
                    SELECT pubquiz_participants.participant_id, pubquiz_participants.answers_channel_id
                    FROM pubquiz_participants
                    INNER JOIN pubquiz_sessions
                    ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
                        AND pubquiz_sessions.session_uuid = $1;
                `, [message.resolved.session.session_uuid])

                participants.forEach(participant => {
                    message.guild.channels.cache.get(participant.answers_channel_id).updateOverwrite(participant.participant_id, {
                        SEND_MESSAGES: false
                    })
                });

                db.none(`
                    UPDATE pubquiz_sessions 
                    SET is_active = false
                    WHERE session_uuid = $1
                `, [message.resolved.session.session_uuid])
            } catch (e) {
                console.log(e)
                message.reply("Something went wrong while trying to stop/lock the Pubquiz :/")
            }
        }
    }
};