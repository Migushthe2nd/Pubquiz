const commando = require('discord.js-commando');
const { v4 } = require('uuid');
const { pgp, db } = require('../../db')

module.exports = class UserInfoCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'edit',
            aliases: [],
            group: 'queue',
            memberName: 'edit',
            description: 'Edit a question in the queue.',
            examples: ['edit "How many toes does a goat have?" 120'],
            guildOnly: true,

            args: [
                {
                    key: 'questionNr',
                    label: 'question number',
                    prompt: 'Which question do you want to edit? Respond with a number. Use the list command to see all set questions.',
                    type: 'integer'
                },
                {
                    key: 'description',
                    label: 'question',
                    prompt: 'What is the new question? Respond with `default` to keep the current value.',
                    type: 'string',
                    wait: 60
                },
                {
                    key: 'countdown',
                    label: 'seconds',
                    prompt: 'How many seconds does each have to answer the question? Respond with `default` to keep the current value or `0` to disable.',
                    type: 'integer',
                    wait: 60,
                    validate: time => {
                        if (time === 'default' || time <= 3600) return true;
                        return 'Time should be 3600 or less seconds';
                    }
                },
                // {
                //     key: 'points',
                //     prompt: 'Hoeveel punten kan een gebruiker maximaal krijgen voor de vraag? Doe `' + config.prefix + 'help pubquiz_sessions/volgende` voor opties',
                //     default: false,
                //     type: 'integer',
                //     wait: 60
                // }
                {
                    key: 'imageUrl',
                    label: 'image url',
                    prompt: 'Do you want to show a different image? If so, send the url, else respond with `default` to keep the current value.',
                    type: 'url',
                    wait: 60
                }
                // {
                //     key: 'videoUrl',
                //     label: 'video url',
                //     prompt: 'Do you want to show a video? Respond with `default` to leave empty.',
                //     type: 'url',
                //     wait: 60
                // }
            ]
        });
    }

    async run (message, { questionNr, description, countdown, points, imageUrl, videoUrl }) {
        const creatorId = message.author.id
        const creatorName = message.author.username
        const guildId = message.channel.guild.id
        const channelId = message.channel.id

        const results = await db.oneOrNone(`
                SELECT *
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

        if (results) {
            if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                const pubquiz = await db.oneOrNone(`
                    SELECT 1
                    FROM pubquiz
                    WHERE pubquiz_uuid = $1
                        AND creator_id = $2;
                `, [results.pubquiz_uuid, creatorId])

                if (pubquiz) {
                    const doesExist = await db.oneOrNone(`
                        SELECT 1
                        FROM pubquiz_questions
                        WHERE pubquiz_uuid = $1
                            AND question_nr = $2;
                    `, [results.pubquiz_uuid, questionNr])
                    if (doesExist) {
                        try {
                            db.none(`
                                UPDATE pubquiz_questions
                                SET description = $3,
                                    countdown = $4,
                                    points = $5,
                                    image_url = $6,
                                    video_url = $7
                                WHERE pubquiz_uuid = $1
                                    AND question_nr = $2;
                            `, [results.pubquiz_uuid, questionNr, description !== 'default' ? description : null, countdown !== 0 ? !isNaN(countdown) ? countdown : null : null, !isNaN(points) !== 'NaN' ? points : null, imageUrl !== 'default' ? imageUrl : null, videoUrl !== 'default' ? videoUrl : null])
                            message.reply(`Question ${questionNr} **successfully editied**.`)
                        } catch (e) {
                            console.log(e)
                            message.reply("Something went wrong while trying to edit the question :/")
                        }
                    } else {
                        message.reply(`Question ${questionNr} does not exist yet.`)
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