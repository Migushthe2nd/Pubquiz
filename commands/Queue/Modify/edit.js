const PubCommand = require('../../../PubCommand')
const { db } = require('../../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'edit',
            description: language => language.get('COMMAND_EDIT_DESCRIPTION'),
            aliases: ['modify'],
            // examples: ['edit "How many toes does a goat have?" 120'],
            runIn: ['text'],
            examples: ['edit 4 "How may toes does a cow have?" 60 https://example.com/another_image.png'],
            usage: '<questionNr:integer> [question:string{,500}] [countdown:integer{,3600}] [image:image]',
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'IS_ORIGINAL_CREATOR', 'HAS_NOT_STARTED', 'HAS_QUESTIONS'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            cooldown: 2,

            // args: [
            //     {
            //         key: 'questionNr',
            //         label: 'question number',
            //         prompt: 'Which question do you want to edit? Respond with a number. Use the list command to see all set questions.',
            //         type: 'integer'
            //     },
            //     {
            //         key: 'description',
            //         label: 'question',
            //         prompt: 'What is the new question? Respond with `default` to keep the current value.',
            //         type: 'string',
            //         wait: 60
            //     },
            //     {
            //         key: 'countdown',
            //         label: 'seconds',
            //         prompt: 'How many seconds does each have to answer the question? Respond with `default` to keep the current value or `0` to disable.',
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
            //         label: 'image url',
            //         prompt: 'Do you want to show a different image? If so, send the url, else respond with `default` to keep the current value.',
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

    async run (message, [questionNr, question, countdown, image, points, videoUrl]) {
        const doesExist = await db.oneOrNone(`
                SELECT 1
                FROM pubquiz_questions
                WHERE pubquiz_uuid = $1
                    AND question_nr = $2;
            `, [message.resolved.pubquiz.pubquiz_uuid, questionNr])
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
                `, [message.resolved.pubquiz.pubquiz_uuid, questionNr, question ? question : null, countdown !== 0 ? !isNaN(countdown) ? countdown : null : null, !isNaN(points) !== 'NaN' ? points : null, image ? image : null, videoUrl ? videoUrl : null])
                message.reply(`Question ${questionNr} **successfully editied**.`)
            } catch (e) {
                console.log(e)
                message.reply("Something went wrong while trying to edit the question :/")
            }
        } else {
            message.reply(`Question ${questionNr} **does not exist** yet.`)
        }
    }
}