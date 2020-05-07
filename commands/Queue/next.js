const PubCommand = require('../../PubCommand')
const { startQuestionCountdown } = require('../../resume/watch_message')
const { questionNew } = require('../../embeds')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'next',
            description: 'Start the next question.',
            runIn: ['text'],
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'HAS_STARTED', 'IS_NOT_ACTIVE_COUNTDOWN'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS', 'MANAGE_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS', 'MANAGE_ROLES'],
            cooldown: 10
        });
    }

    async run (message) {
        try {
            const nextQuestion = await db.oneOrNone(`
                SELECT *
                FROM pubquiz_questions
                WHERE pubquiz_uuid = $1
                    AND finished = false
                    AND question_nr > $2
                ORDER BY question_nr
                LIMIT 1;
            `, [message.resolved.session.pubquiz_uuid, message.resolved.session.question_nr])

            if (nextQuestion) {
                let endTime = null
                if (nextQuestion.countdown)
                    endTime = new Date(new Date().getTime() + nextQuestion.countdown * 1000 + 1000)

                const allParticipants = await db.any(`
                    UPDATE pubquiz_sessions 
                    SET question_nr = question_nr + 1
                    WHERE session_uuid = $1;

                    SELECT pubquiz_sessions.feed_channel_id, pubquiz_sessions.question_nr, pubquiz_participants.participant_id, pubquiz_participants.answers_channel_id
                    FROM pubquiz_participants
                    INNER JOIN pubquiz_sessions
                    ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
                        AND pubquiz_sessions.session_uuid = $1;
                `, [message.resolved.session.session_uuid])

                let questionMessage = null
                if (nextQuestion.countdown) {
                    questionMessage = await message.guild.channels.cache.get(allParticipants[0].feed_channel_id).send(questionNew(nextQuestion.question_nr, nextQuestion.description, message.author, nextQuestion.image_url, endTime))

                    startQuestionCountdown(questionMessage, {
                        sessionUuid: message.resolved.session.session_uuid,
                        questionNr: nextQuestion.question_nr,
                        description: nextQuestion.description,
                        creator: message.author,
                        endTime
                    })
                } else {
                    questionMessage = await message.guild.channels.cache.get(allParticipants[0].feed_channel_id).send(questionNew(nextQuestion.question_nr, nextQuestion.description, message.author, nextQuestion.image_url))
                }

                // Allow users to send their answers
                allParticipants.forEach(participant => {
                    message.guild.channels.cache.get(participant.answers_channel_id).updateOverwrite(participant.participant_id, {
                        SEND_MESSAGES: true
                    })
                });

                db.none(`
                    UPDATE pubquiz_sessions 
                    SET question_message_id = $2,
                        countdown_endtime = $3,
                        has_started = true,
                        is_active = true,
                        is_open = false
                    WHERE session_uuid = $1
                `, [message.resolved.session.session_uuid, questionMessage.id, endTime])

                if (endTime)
                    message.reply(`The Pubquiz next question was **sent successfully**!`)
                else
                    message.reply(`The Pubquiz next question was **sent successfully**! Use the stop/lock command to lock the answers channels and end the question.`)
            } else {
                message.reply(`The Pubquiz has **no new questions**. You can review the answers now, if you haven't already.`)
            }
        } catch (e) {
            console.log(e)
            message.reply("Something **went wrong** while trying to start the question :/")
        }
    }
}