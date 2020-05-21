const { watchJoinMessage, startQuestionCountdown } = require('./watch_message')
const { db } = require('../db')
let activityIndex = 0;

const getSessionCountString = () =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT COUNT(*)::int
            FROM pubquiz_sessions`
        ).then(({ count }) => {
            resolve(count !== 1 ? `${count} ongoing pubquizzes` : `${count} ongoing pubquiz`)
        })
    })

const getParticipantCountString = () =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT COUNT(*)::int
            FROM pubquiz_participants`
        ).then(({ count }) => {
            resolve(count !== 1 ? `${count} participants` : `${count} participant`)
        })
    })

const getQuestionCountString = () =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT COUNT(*)::int
            FROM pubquiz_questions`
        ).then(({ count }) => {
            resolve(count !== 1 ? `${count} questions` : `${count} question`)
        })
    })
const getCreatedCountString = () =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT COUNT(*)::int
            FROM pubquiz`
        ).then(({ count }) => {
            resolve(`${count} created`)
        })
    })

const activities_list = [
    getSessionCountString,
    getParticipantCountString,
    getQuestionCountString,
    getCreatedCountString,
    client => client.guilds.cache.size !== 1 ? `${client.guilds.cache.size} guilds` : `${client.guilds.cache.size} guild`
];

const setActivity = async (client) => {
    const item = activities_list[activityIndex]
    const message = typeof item === 'function' ? await item(client) : item

    client.user.setActivity(
        `${process.env.BOT_PREFIX} help | ${message}`,
        {
            type: "LISTENING",
        }
    );

    if (activityIndex === activities_list.length - 1)
        activityIndex = 0;
    else activityIndex++
}

exports.setActivities = (client) => {
    setActivity(client)
    setInterval(async () => {
        setActivity(client)
    }, 20000)
}

exports.resumeQuizes = async (client) => {
    const activeQuizes = await db.any(`
        SELECT pubquiz.*, pubquiz_sessions.*
            FROM pubquiz_sessions
        INNER JOIN pubquiz
        ON pubquiz.pubquiz_uuid = pubquiz_sessions.pubquiz_uuid;
    `)

    // Resume each quiz
    activeQuizes.forEach(async (pubquiz) => {
        const guild = await client.guilds.cache.get(pubquiz.guild_id)
        const categoryChannel = await guild.channels.cache.get(pubquiz.category_channel_id)
        const feedChannel = await guild.channels.cache.get(pubquiz.feed_channel_id)
        const controlsChannel = await guild.channels.cache.get(pubquiz.controls_channel_id)
        const creator = await guild.member(pubquiz.creator_id).user

        if (controlsChannel && feedChannel) {
            // Say "I just restarted"
            controlsChannel.send(`<@!${creator.id}>, My program got restarted just now. I tried to resume everything, but if something is off please notify Migush#4096.`)

            // Resume join message
            if (pubquiz.join_message_id && pubquiz.question_nr === 0) {
                const joinMessage = await feedChannel.messages.fetch(pubquiz.join_message_id)
                const dbParticipants = pubquiz.participants
                watchJoinMessage(joinMessage, { sessionUuid: pubquiz.session_uuid, creator, categoryChannel, dbParticipants, openedTime: pubquiz.opened_time, imageUrl: activeQuizes.image_url })
            }

            // Resume question
            if (pubquiz.question_nr > 0 && pubquiz.countdown_endtime !== null) {
                const questionMessage = await feedChannel.messages.fetch(pubquiz.question_message_id)
                startQuestionCountdown(questionMessage, {
                    sessionUuid: pubquiz.session_uuid,
                    questionNr: pubquiz.question_nr,
                    creator,
                    endTime: pubquiz.countdown_endtime
                })
            }
        } else {
            if (categoryChannel) {
                await categoryChannel.children.forEach(channel => channel.delete())
                setTimeout(() => {
                    categoryChannel.delete();
                }, 200)
            }

            db.none(`
        --DELETE FROM pubquiz_scores
        --WHERE session_uuid = $1;

        DELETE FROM pubquiz_participants
        WHERE session_uuid = $1;

        DELETE FROM pubquiz_sessions
        WHERE session_uuid = $1;
        `, [pubquiz.session_uuid])
        }
    })
}