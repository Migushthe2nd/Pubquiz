const commando = require('discord.js-commando');
const { v4 } = require('uuid');
const { pgp, db } = require('../../db')

module.exports = class UserInfoCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'list',
            aliases: ['questions'],
            group: 'queue',
            memberName: 'list',
            description: 'Show all questions in the queue.',
            guildOnly: true
        });
    }

    async run (message, { description, countdown, points, imageUrl, videoUrl }) {
        const creatorId = message.author.id
        const creatorName = message.author.username
        const guildId = message.channel.guild.id
        const channelId = message.channel.id

        const results = await db.oneOrNone(`
                SELECT *
                FROM pubquiz_sessions
                WHERE creator_id = $1
            `, [creatorId])

        if (results) {
            if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                try {
                    const questions = await db.any(`
                        SELECT *
                        FROM pubquiz_questions
                        WHERE pubquiz_uuid = $1
                    `, [results.pubquiz_uuid])

                    if (questions && questions.length > 0) {
                        let fullString = "__All questions:__"
                        questions.forEach(question => {
                            fullString += '\n'
                                + (question.description ?
                                    `\n__**Question ${question.question_nr}**:__ *${question.description}*` :
                                    `\n__**Question ${question.question_nr}**__`
                                ) + (question.question_nr < results.question_nr || (question.question_nr === results.question_nr && !results.is_active) ? ' (finished)' : (question.question_nr === results.question_nr && results.is_active) ? ' (current)' : '')
                                + (question.countdown ? `\n**       Seconds:** ${question.countdown}` : '')
                                + (question.points ? `\n**      Points:** ${question.points}` : '')
                                + (question.image_url ? `\n**       Image Url:** <${question.image_url}>` : '')
                                + (question.video_url ? `\n**       Video Url:** <${question.video_url}>` : '')
                        })

                        message.channel.send(fullString, { split: true })
                    } else {
                        message.reply("This Pubquiz has **no questions** set.")
                    }
                } catch (e) {
                    console.log(e)
                    message.reply("Something **went wrong** while trying to start the question :/")
                }
            } else {
                message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
            }
        } else {
            message.reply("You **haven't created** a Pubquiz yet.")
        }
    }
}