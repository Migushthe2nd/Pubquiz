const { Inhibitor } = require('klasa');
const { db } = require('../db')

let session
const getSession = async (authorId) =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT *
            FROM pubquiz_sessions
            WHERE creator_id = $1;
        `, [authorId])
            .then(result => {
                resolve(session = result)
            })
    })

let pubquiz
const getPubquiz = async (authorId) =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT *
            FROM pubquiz
            WHERE pubquiz_uuid = (
                    SELECT pubquiz_uuid
                    FROM pubquiz_sessions
                    WHERE creator_id = $1
                );
        `, [authorId])
            .then(result => {
                resolve(pubquiz = result)
            })
    })

let questions
const getQuestions = async (authorId) =>
    new Promise(resolve => {
        db.any(`
            SELECT *
            FROM pubquiz_questions
            WHERE pubquiz_uuid = (
                    SELECT pubquiz_uuid
                    FROM pubquiz_sessions
                    WHERE creator_id = $1
                );
        `, [authorId])
            .then(result => {
                resolve(questions = result)
            })
    })

// let question
// const getQuestion = async (authorId, questionNr) =>
//     new Promise(resolve => {
//         db.oneOrNone(`
//             SELECT 1
//             FROM pubquiz_questions
//             WHERE pubquiz_uuid = (
//                     SELECT pubquiz_uuid
//                     FROM pubquiz_sessions
//                     WHERE creator_id = $1
//                 )
//                 AND question_nr = $2;
//         `, [authorId, questionNr])
//             .then(result => {
//                 resolve(question = !!result)
//             })
//     })

let participation
const getParticipation = async (authorId) =>
    new Promise(resolve => {
        db.oneOrNone(`
            SELECT pubquiz_sessions.guild_id, pubquiz_sessions.feed_channel_id
            FROM pubquiz_participants
            INNER JOIN pubquiz_sessions
            ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
            WHERE participant_id = $1;
        `, [authorId])
            .then(result => {
                resolve(participation = result)
            })
    })


module.exports = class extends Inhibitor {

    constructor(...args) {
        super(...args, {
            name: 'conditions',
            enabled: true,
            spamProtection: false
        });
    }

    async run (message, command) {
        if (message.command.name === command.name) {
            if (command.conditions && command.conditions.length > 0) {
                const guildId = message.channel.guild.id
                const channelId = message.channel.id
                const authorId = message.author.id

                session = undefined
                pubquiz = undefined
                questions = undefined
                participation = undefined

                try {
                    message.resolved = {}
                    for (const i in command.conditions) {
                        const condition = command.conditions[i]
                        switch (condition) {
                            case 'ACTIVE_SESSION':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!session)
                                    throw `You **haven't created** a Pubquiz yet.`
                                break;

                            case 'NO_ACTIVE_SESSION':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session)
                                    throw `You have **already created** a Pubquiz here: ${this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.controls_channel_id)}. There can only be one created Pubquiz per user.`
                                break;

                            case 'IS_PARTICIPANT':
                                if (participation === undefined) message.resolved.participation = await getParticipation(authorId)
                                if (!participation)
                                    throw `You **aren't** a participant yet.`
                                break;

                            case 'IS_NOT_PARTICIPANT':
                                if (participation === undefined) message.resolved.participation = await getParticipation(authorId)
                                if (participation)
                                    throw `You are **already participating** in a Pubquiz here: ${this.client.guilds.cache.get(participation.guild_id).channels.cache.get(participation.feed_channel_id)}.`
                                break;

                            case 'CORRECT_GUILD':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.guild_id === guildId))
                                    throw `You must use this command in ${this.client.guilds.cache.get(session.guild_id)}.`
                                break;

                            case 'CONTROLS_CHANNEL_OR_FEED_CHANNEL':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.guild_id === guildId && (session.controls_channel_id === channelId || session.feed_channel_id === channelId)))
                                    throw `You may only use this command in ${this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.feed_channel_id)} and ${this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.controls_channel_id)}.`
                                break;

                            case 'CONTROLS_CHANNEL':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.guild_id === guildId && session.controls_channel_id === channelId))
                                    throw `You must use this command in ${this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.controls_channel_id)}.`
                                break;

                            case 'HAS_PARTICIPANTS':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.participants && session.participants.length > 0))
                                    throw `The Pubquiz has **no participants** yet. Be sure to use the open command so people can join.`
                                break;

                            case 'HAS_STARTED':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!session.has_started)
                                    throw `The Pubquiz has **not been started** yet.`
                                break;

                            case 'HAS_NOT_STARTED':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session.has_started)
                                    throw `The Pubquiz has **already been started**.`
                                break;

                            case 'IS_OPEN':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!session.is_open)
                                    throw `The Pubquiz is **still closed**.`
                                break;

                            case 'IS_NOT_OPEN':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session.is_open)
                                    throw `The Pubquiz is **already open**.`
                                break;

                            case 'IS_NOT_ACTIVE_COUNTDOWN':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session.countdown_endtime)
                                    throw `There is an **ongoing timed question**. You **can't** manually stop it so please wait for it to finish.`
                                break;

                            case 'IS_ORIGINAL_CREATOR':
                                if (pubquiz === undefined) message.resolved.pubquiz = await getPubquiz(authorId)
                                if (pubquiz.creator_id !== authorId)
                                    throw `You are **not the original creator** of this pubquiz, so you cannot modify the questions. In the future you may use the copy command to enable editing.`
                                break;

                            case 'HAS_QUESTIONS':
                                if (questions === undefined) message.resolved.questions = await getQuestions(authorId)
                                if (!(questions && questions.length > 0))
                                    throw `The Pubquiz has **no questions** yet.`
                                break;

                            // case 'QUESTION_EXISTS':
                            //     if (question === undefined) message.resolved.question = await getQuestion(authorId, questionNr)
                            //     if (!question)
                            //         throw `Question ${questionNr} **does not exist** yet.`
                            //     break;
                        }
                    }
                    return false
                } catch (e) {
                    message.reply(e)
                    return true
                }
            } else return false
        }
    }
};