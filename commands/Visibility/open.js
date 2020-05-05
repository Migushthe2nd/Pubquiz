const { Command } = require('klasa');
const { watchJoinMessage } = require('../../resume/watch_message')
const { quizDetails } = require('../../embeds')
const { db } = require('../../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'open',
            description: 'Allow people to see and join the Pubquiz. This will send the join message in #feed.',
            runIn: ['text'],
        });
    }

    async run (message) {
        const creatorId = message.author.id
        const channelId = message.channel.id
        const guildId = message.channel.guild.id

        const results = await db.oneOrNone(`
                SELECT pubquiz_sessions.*, pubquiz.image_url
                FROM pubquiz_sessions
                INNER JOIN pubquiz
                ON pubquiz.pubquiz_uuid = pubquiz_sessions.pubquiz_uuid
                WHERE pubquiz_sessions.creator_id = $1;
            `, [creatorId])

        if (results) {
            if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                if (!results.has_started) {
                    if (!results.is_open) {
                        const categoryChannel = await message.channel.guild.channels.cache.get(results.category_channel_id)
                        const feedChannel = await message.channel.guild.channels.cache.get(results.feed_channel_id)

                        if (results.ever_opened) {
                            const joinMessage = await feedChannel.messages.fetch(results.join_message_id)
                            watchJoinMessage(joinMessage, { sessionUuid: results.session_uuid, creator: message.author, categoryChannel, resultsopenedTime: results.opened_time, imageUrl: results.image_url })

                            db.none(`
                                UPDATE pubquiz_sessions 
                                SET is_open = true
                                WHERE session_uuid = $1
                            `, [results.session_uuid])
                        } else {
                            try {

                                feedChannel.updateOverwrite(guildId, {
                                    VIEW_CHANNEL: true,
                                })

                                // Send joinMessage
                                feedChannel.send("Pubquiz opened :tada:")
                                feedChannel.send(quizDetails(
                                    results.title,
                                    results.description,
                                    message.author,
                                    null,
                                    feedChannel.guild.channels.cache.size,
                                    null,
                                    results.image_url,
                                )).then(async (joinMessage) => {

                                    const { opened_time } = await db.one(`
                                        UPDATE pubquiz_sessions 
                                        SET join_message_id = $2, opened_time = NOW(), is_open = true, ever_opened = true
                                        WHERE session_uuid = $1
                                        RETURNING opened_time;
                                    `, [results.session_uuid, joinMessage.id])
                                    watchJoinMessage(joinMessage, { sessionUuid: results.session_uuid, creator: message.author, categoryChannel, openedTime: opened_time, imageUrl: results.image_url })
                                })

                            } catch (e) {
                                console.log(e)
                                message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
                            }
                        }
                        message.reply("The Pubquiz was **opened successfully** and people can now join!")
                    } else {
                        message.reply("The Pubquiz is **already open**.")
                    }
                } else {
                    message.reply("The Pubquiz has **already started**.")
                }
            } else {
                message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
            }
        } else {
            message.reply("You **haven't created** a Pubquiz yet.")
        }
    }
};