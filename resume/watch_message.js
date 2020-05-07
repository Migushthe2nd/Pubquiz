const Discord = require("discord.js");
const { question_update_interval } = require('../config.json')
const { quizDetails, questionNew, answerDividerAbove } = require('../embeds')
const { db } = require('../db')
// const _ = require('lodash');

let joinMessage = null
let participantsCollector = null
let beforeCloseParticipants = null
exports.watchJoinMessage = (message, { sessionUuid, creator, categoryChannel, dbParticipants, openedTime }) => {
    joinMessage = message

    joinMessage.react("✋")

    const joinFilter = (reaction, user) => {
        return reaction.emoji.name === "✋" && user.id !== creator.id && user.id !== message.author.id && (50 - 1 - joinMessage.channel.parent.children.size >= 0);
    }

    participantsCollector = new Discord.ReactionCollector(message, joinFilter, { dispose: true });

    const updateMessage = async (participants, joined) => {
        beforeCloseParticipants = participants
        joinMessage = await message.edit(quizDetails(
            message.embeds.length > 0 ? message.embeds[0].title : null,
            message.embeds.length > 0 ? message.embeds[0].description : null,
            creator,
            participants,
            50 - message.channel.parent.children.size - (joined ? 1 : 0),
            openedTime,
            message.embeds.length > 0 ? message.embeds[0].thumbnail ? message.embeds[0].thumbnail.url : null : null,
            false
        ))
    }

    participantsCollector.on('collect', async (reaction, user) => {
        const results = await db.oneOrNone(`
                SELECT participants, spectators
                FROM pubquiz_sessions
                WHERE session_uuid = $2;
            `, [user.id, sessionUuid])

        if (results && (results.participants ? !results.participants.includes(user.id) : true)) {
            if (results.spectators ? !results.spectators.includes(user.id) : true) {
                message.guild.channels.create(`${user.username}'s answers`, {
                    type: 'text',
                    permissionOverwrites: [
                        {
                            id: message.guild.id,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: creator.id,
                            allow: ['VIEW_CHANNEL', 'ADD_REACTIONS'],
                            deny: ['SEND_MESSAGES']
                        },
                        {
                            id: user.id,
                            allow: ['VIEW_CHANNEL'],
                            deny: ['SEND_MESSAGES'],
                        },
                    ],
                }).then(async answersChannel => {
                    answersChannel.setParent(categoryChannel.id)
                    // answersChannel.send('Please wait for the host to start the Pubquiz :clock3:')

                    // Add view permissions
                    joinMessage.channel.createOverwrite(user, {
                        VIEW_CHANNEL: true
                    })
                    if (results.spectators && results.spectators.length > 0)
                        results.spectators.forEach(spectatorId => {
                            answersChannel.createOverwrite(spectatorId, {
                                VIEW_CHANNEL: true,
                                SEND_MESSAGES: false,
                                ADD_REACTIONS: false
                            })
                        })

                    const { participants } = await db.one(`
                        INSERT INTO pubquiz_participants (session_uuid, participant_id, answers_channel_id)
                        VALUES ($1, $2, $3)
                        ON CONFLICT DO NOTHING;
    
                        UPDATE pubquiz_sessions
                        SET participants = array_append(participants, $2)
                        WHERE session_uuid = $1
                        RETURNING participants;
                    `, [sessionUuid, user.id, answersChannel.id])

                    updateMessage(participants, true)
                })
            }
        }
    })

    participantsCollector.on('remove', async (reaction, user) => {
        const results = await db.oneOrNone(`
            SELECT participants, spectators
            FROM pubquiz_sessions
            WHERE session_uuid = $2;
        `, [user.id, sessionUuid])

        if (results && (results.participants ? results.participants.includes(user.id) : true)) {
            if (results.spectators ? !results.spectators.includes(user.id) : true) {

                const { answers_channel_id } = await db.one(`
                    SELECT pubquiz_participants.answers_channel_id
                    FROM pubquiz_participants
                    INNER JOIN pubquiz_sessions
                    ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
                    WHERE pubquiz_participants.participant_id = $1;
                `, [user.id])

                await message.channel.guild.channels.cache.get(answers_channel_id).delete()

                // Add view permissions
                joinMessage.channel.createOverwrite(user, {})

                const { participants } = await db.one(`
                    DELETE FROM pubquiz_participants
                    WHERE participant_id = $2;

                    UPDATE pubquiz_sessions
                    SET participants = array_remove(participants, $2)
                    WHERE session_uuid = $1
                    RETURNING participants;
                `, [sessionUuid, user.id])

                updateMessage(participants)
            }

            updateMessage(beforeCloseParticipants || dbParticipants)
        }
    })

    updateMessage(beforeCloseParticipants || dbParticipants)
}

exports.stopJoinMessage = async (sessionUuid) => {
    if (participantsCollector) {
        participantsCollector.stop()
    }

    if (joinMessage) {
        try {
            joinMessage.reactions.cache.each(reaction => {
                if (reaction._emoji.name === '✋') reaction.remove()
            })

            const results = await db.oneOrNone(`
                SELECT participants
                FROM pubquiz_sessions
                WHERE session_uuid = $1;
            `, [sessionUuid])

            if (results) {
                joinMessage.edit(quizDetails(
                    joinMessage.embeds.length > 0 ? joinMessage.embeds[0].title : null,
                    joinMessage.embeds.length > 0 ? joinMessage.embeds[0].description : null,
                    {
                        username: joinMessage.embeds.length > 0 ? joinMessage.embeds[0].author.name : null,
                        avatarURL: joinMessage.embeds.length > 0 ? joinMessage.embeds[0].author.iconURL : null
                    },
                    results.participants,
                    50 - joinMessage.channel.parent.children.size,
                    results.opened_time,
                    joinMessage.embeds.length > 0 ? joinMessage.embeds[0].thumbnail ? joinMessage.embeds[0].thumbnail.url : null : null,
                    true
                ))
                joinMessage = null
            }
        } catch (e) {
            console.error(e)
        }
    }
}

exports.stopQuestion = async (message, { sessionUuid, questionNr, description, creator, imageUrl }) => {
    message.edit(questionNew(
        questionNr,
        description ? description : message.embeds.length > 0 ? message.embeds[0].description : null,
        creator,
        imageUrl ? imageUrl : message.embeds.length > 0 ? message.embeds[0].image ? message.embeds[0].image.url : null : null,
        false
    ))

    const participants = await db.any(`
            UPDATE pubquiz_sessions
            SET countdown_endtime = NULL
            WHERE session_uuid = $1;

            SELECT pubquiz_participants.participant_id, pubquiz_participants.answers_channel_id
            FROM pubquiz_participants
            INNER JOIN pubquiz_sessions
            ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
                AND pubquiz_sessions.session_uuid = $1;
        `, [sessionUuid])

    participants.forEach(participant => {
        message.guild.channels.cache.get(participant.answers_channel_id).updateOverwrite(participant.participant_id, {
            SEND_MESSAGES: false
        })
        // Send divider
        message.guild.channels.cache.get(participant.answers_channel_id).send(answerDividerAbove(
            questionNr,
            description ? description : message.embeds.length > 0 ? message.embeds[0].description : null,
            participant.participant_id
        ))
    })
}

exports.startQuestionCountdown = (message, { sessionUuid, questionNr, description, creator, imageUrl, endTime }) => {
    const myLoop = () => {
        setTimeout(() => {
            if (endTime.getTime() - new Date().getTime() > question_update_interval) {
                message.edit(questionNew(
                    questionNr,
                    description ? description : message.embeds.length > 0 ? message.embeds[0].description : null,
                    creator,
                    imageUrl ? imageUrl : message.embeds.length > 0 ? message.embeds[0].image ? message.embeds[0].image.url : null : null,
                    endTime
                ))
                db.none(`
                        UPDATE pubquiz_sessions
                        SET countdown_endtime = $2,
                            is_active = false
                        WHERE session_uuid = $1
                    `, [sessionUuid, endTime])
                myLoop();
            } else {
                this.stopQuestion(message, { sessionUuid, questionNr, description, creator, imageUrl })
            }
        }, question_update_interval)
    }
    myLoop();
}