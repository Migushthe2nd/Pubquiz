const PubCommand = require('../../PubCommand')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'list',
            aliases: ['questions', 'queue'],
            description: 'Show all questions in the queue.',
            runIn: ['text'],
            cooldown: 2,
        });
    }

    async run (message) {
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
                                + (question.countdown ? `\n**\tSeconds:** ${question.countdown}` : '')
                                + (question.points ? `\n**\tPoints:** ${question.points}` : '')
                                + (question.image_url ? `\n**\tImage Url:** <${question.image_url}>` : '')
                                + (question.video_url ? `\n**\tVideo Url:** <${question.video_url}>` : '')
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