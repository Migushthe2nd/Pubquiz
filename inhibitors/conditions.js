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
                                    throw message.language.get('NO_ACTIVE_SESSION')
                                break;

                            case 'NO_ACTIVE_SESSION':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session)
                                    throw message.language.get('ACTIVE_SESSION', this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.controls_channel_id))
                                break;

                            case 'IS_PARTICIPANT':
                                if (participation === undefined) message.resolved.participation = await getParticipation(authorId)
                                if (!participation)
                                    throw message.language.get('IS_NOT_PARTICIPANT')
                                break;

                            case 'IS_NOT_PARTICIPANT':
                                if (participation === undefined) message.resolved.participation = await getParticipation(authorId)
                                if (participation)
                                    throw message.language.get('IS_PARTICIPANT', this.client.guilds.cache.get(participation.guild_id).channels.cache.get(participation.feed_channel_id))
                                break;

                            case 'CORRECT_GUILD':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.guild_id === guildId))
                                    throw message.language.get('INCORRECT_GUILD', this.client.guilds.cache.get(session.guild_id))
                                break;

                            case 'CONTROLS_CHANNEL_OR_FEED_CHANNEL':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.guild_id === guildId && (session.controls_channel_id === channelId || session.feed_channel_id === channelId)))
                                    throw message.language.get('NOT_CONTROLS_CHANNEL_OR_FEED_CHANNEL', this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.feed_channel_id), this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.controls_channel_id))
                                break;

                            case 'CONTROLS_CHANNEL':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.guild_id === guildId && session.controls_channel_id === channelId))
                                    throw message.language.get('NOT_CONTROLS_CHANNEL', this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.controls_channel_id))
                                break;

                            case 'HAS_PARTICIPANTS':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!(session.participants && session.participants.length > 0))
                                    throw message.language.get('HAS_NO_PARTICIPANTS')
                                break;

                            case 'HAS_STARTED':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!session.has_started)
                                    throw message.language.get('HAS_NOT_STARTED')
                                break;

                            case 'HAS_NOT_STARTED':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session.has_started)
                                    throw message.language.get('HAS_STARTED')
                                break;

                            case 'IS_OPEN':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (!session.is_open)
                                    throw message.language.get('IS_NOT_OPEN')
                                break;

                            case 'IS_NOT_OPEN':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session.is_open)
                                    throw message.language.get('IS_OPEN')
                                break;

                            case 'IS_NOT_ACTIVE_COUNTDOWN':
                                if (session === undefined) message.resolved.session = await getSession(authorId)
                                if (session.countdown_endtime)
                                    throw message.language.get('IS_ACTIVE_COUNTDOWN')
                                break;

                            case 'IS_ORIGINAL_CREATOR':
                                if (pubquiz === undefined) message.resolved.pubquiz = await getPubquiz(authorId)
                                if (pubquiz.creator_id !== authorId)
                                    throw message.language.get('IS_NOT_ORIGINAL_CREATOR')
                                break;

                            case 'HAS_QUESTIONS':
                                if (questions === undefined) message.resolved.questions = await getQuestions(authorId)
                                if (!(questions && questions.length > 0))
                                    throw message.language.get('HAS_NO_QUESTIONS')
                                break;

                            // case 'QUESTION_EXISTS':
                            //     if (question === undefined) message.resolved.question = await getQuestion(authorId, questionNr)
                            //     if (!question)
                            //         throw message.language.get('QUESTION_NOT_EXISTS', questionNr)
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