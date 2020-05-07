const PubCommand = require('../../../PubCommand')
const { v4 } = require('uuid');
const { db } = require('../../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'add',
            description: 'Add a new question to the queue.',
            // examples: ['add "How many toes does a goat have?" 120'],
            runIn: ['text'],
            examples: ['add "How many toes does a goat have?" 120', 'add "What is 20+4?" https://example.com/image.png'],
            usage: '<question:string{,500}> [countdown:integer{,3600}] [image:image]',

            // args: [
            //     {
            //         key: 'description',
            //         label: 'question',
            //         prompt: 'What is the question? Respond with `default` for the default value (none).',
            //         type: 'string',
            //         wait: 60
            //     },
            //     {
            //         key: 'countdown',
            //         label: 'seconds',
            //         prompt: 'How many seconds does each have to answer the question? Respond with `default` or `0` to disable (no limit).',
            //         type: 'integer',
            //         wait: 60,
            //         validate: time => {
            //             if (time === 'default' || time <= 3600) return true;
            //             return 'Time should be 3600 or less seconds';
            //         }
            //     },
            //     // {
            //     //     key: 'points',
            //     //     prompt: 'Hoeveel punten kan een gebruiker maximaal krijgen voor de vraag? Doe `' + config.prefix + 'help pubquiz_sessions/volgende` voor opties',
            //     //     default: false,
            //     //     type: 'integer',
            //     //     wait: 60
            //     // }
            //     {
            //         key: 'imageUrl',
            //         label: 'image url or upload',
            //         prompt: 'Do you want to show an image? If so, send the url or upload an image, else respond with `default` to leave empty.',
            //         type: 'url',
            //         wait: 60
            //     }
            //     // {
            //     //     key: 'videoUrl',
            //     //     label: 'video url',
            //     //     prompt: 'Do you want to show a video? Respond with `default` to leave empty.',
            //     //     type: 'url',
            //     //     wait: 60
            //     // }
            // ]
        });
    }

    async run (message, [question, countdown, image, points, videoUrl]) {
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
                const pubquiz = await db.oneOrNone(`
                    SELECT *
                    FROM pubquiz
                    WHERE pubquiz_uuid = $1
                        AND creator_id = $2
                `, [results.pubquiz_uuid, creatorId])
                if (results.creator_id === pubquiz.creator_id) {
                    try {
                        db.none(`
                            INSERT INTO pubquiz_questions (pubquiz_uuid, question_uuid, description, countdown, points, image_url, video_url, question_nr)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, 
                                (
                                    SELECT COUNT(*) + 1
                                    FROM pubquiz_questions
                                    WHERE pubquiz_uuid = $1
                                )
                            )
                        `, [results.pubquiz_uuid, v4(), question ? question : null, countdown !== 0 ? !isNaN(countdown) ? countdown : null : null, !isNaN(points) !== 'NaN' ? points : null, image, videoUrl ? videoUrl : null])
                        message.reply("Question **successfully added** to the queue.")
                    } catch (e) {
                        console.log(e)
                        message.reply("Something **went wrong** while trying to start the question :/")
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