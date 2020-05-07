const PubCommand = require('../../PubCommand')
const { watchJoinMessage } = require('../../resume/watch_message')
const { quizDetails } = require('../../embeds')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'open',
            description: 'Allow people to see and join the Pubquiz. This will send the join message in #feed.',
            runIn: ['text'],
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'HAS_NOT_STARTED', 'IS_NOT_OPEN'],
            cooldown: 5,
        });
    }

    async run (message) {
        const guildId = message.channel.guild.id

        const categoryChannel = await message.channel.guild.channels.cache.get(message.resolved.session.category_channel_id)
        const feedChannel = await message.channel.guild.channels.cache.get(message.resolved.session.feed_channel_id)

        if (message.resolved.session.ever_opened) {
            const joinMessage = await feedChannel.messages.fetch(message.resolved.session.join_message_id)
            watchJoinMessage(joinMessage, { sessionUuid: message.resolved.session.session_uuid, creator: message.author, categoryChannel, resultsopenedTime: message.resolved.session.opened_time })

            db.none(`
                UPDATE pubquiz_sessions 
                SET is_open = true
                WHERE session_uuid = $1
            `, [message.resolved.session.session_uuid])
        } else {
            try {
                const { image_url } = await db.oneOrNone(`
                    SELECT pubquiz.image_url
                    FROM pubquiz
                    WHERE pubquiz_uuid = $1;
                `, [message.resolved.session.pubquiz_uuid])

                feedChannel.updateOverwrite(guildId, {
                    VIEW_CHANNEL: true,
                })

                // Send joinMessage
                feedChannel.send("Pubquiz opened :tada:")
                feedChannel.send(quizDetails(
                    message.resolved.session.title,
                    message.resolved.session.description,
                    message.author,
                    null,
                    feedChannel.guild.channels.cache.size,
                    null,
                    image_url,
                )).then(async (joinMessage) => {
                    const { opened_time } = await db.one(`
                        UPDATE pubquiz_sessions 
                        SET join_message_id = $2, opened_time = NOW(), is_open = true, ever_opened = true
                        WHERE session_uuid = $1
                        RETURNING opened_time;
                    `, [message.resolved.session.session_uuid, joinMessage.id])
                    watchJoinMessage(joinMessage, { sessionUuid: message.resolved.session.session_uuid, creator: message.author, categoryChannel, openedTime: opened_time })
                })

            } catch (e) {
                console.log(e)
                message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
            }
        }
        message.reply("The Pubquiz was **opened successfully** and people can now join!")
    }
};