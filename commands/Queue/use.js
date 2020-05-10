const PubCommand = require('../../PubCommand')
const { newPubquiz } = require('../../embeds')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'use',
            description: language => language.get('COMMAND_USE_DESCRIPTION'),
            // examples: ['use 902fa8c6-8a23-11ea-bc55-0242ac130003'],
            runIn: ['text'],
            examples: ['use 902fa8c6-8a23-11ea-bc55-0242ac130003'],
            usage: '<UUID:uuid>',
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'HAS_NOT_STARTED'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            cooldown: 10,

            // args: [
            //     {
            //         key: 'uuid',
            //         label: 'UUID',
            //         prompt: 'Enter the UUID of the Pubquiz you want to use. The current queue will be replaced with the new one! If you wish to go back, use this command again and specify the UUID I DM\'ed you earlier.',
            //         type: 'uuid',
            //         wait: 60
            //     }
            // ]
        });
    }

    async run (message, [uuid]) {
        const creatorId = message.author.id
        const creatorName = message.author.username

        if (message.resolved.session.pubquiz_uuid !== uuid) {
            const doesExist = await db.oneOrNone(`
                SELECT 1
                FROM pubquiz
                WHERE pubquiz_uuid = $1;
            `, [uuid])

            if (doesExist) {
                try {
                    const { creator_id, title, description, creator_name, creator_avatarurl, image_url, question_amount } = await db.oneOrNone(`
                        UPDATE pubquiz_sessions
                        SET pubquiz_uuid = $2
                        WHERE session_uuid = $1;

                        SELECT *, (
                            SELECT count(*)
                            FROM pubquiz_questions
                            WHERE pubquiz_uuid = $2
                        ) as question_amount
                        FROM pubquiz
                        WHERE pubquiz_uuid = $2;
                    `, [message.resolved.session.session_uuid, uuid])

                    if (creatorId === creator_id) {
                        message.reply({
                            content: "Pubquiz **switched successfully**. You are the original author. Now using:",
                            embed: newPubquiz(creator_name, creator_avatarurl, title, description, question_amount, null, null, image_url)
                        })

                        if (creator_name !== creatorName || creator_avatarurl !== message.author.avatarURL({ dynamic: true, size: 32 })) {
                            db.none(`
                                UPDATE pubquiz
                                SET creator_name = $2,
                                    creator_avatarurl = $3
                                WHERE creator_id = $1;
                            `, [creatorId, creatorName, message.author.avatarURL({ dynamic: true, size: 32 })])
                        }
                    } else
                        message.reply({
                            content: "Pubquiz **switched successfully**. If you wish to edit it, use the copy command. Now using:",
                            embed: newPubquiz(creator_name, creator_avatarurl, title, description, question_amount, null, null, image_url)
                        })
                } catch (e) {
                    console.log(e)
                    message.reply("Something **went wrong** while trying to switch to that pubquiz :/")
                }
            } else {
                message.reply("That Pubquiz **does not exist**.")
            }
        } else {
            message.reply("**Already using** that Pubquiz.")
        }
    }
}