const commando = require('discord.js-commando');
const { stopJoinMessage } = require('../../events/watch_message')
const { pgp, db } = require('../../db')

module.exports = class UserInfoCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'close',
            aliases: [],
            group: 'main',
            memberName: 'close',
            description: 'Close participation.',
            guildOnly: true
        });
    }

    async run (message, { title, description }) {
        const creatorId = message.author.id
        const creatorName = message.author.username
        const channelId = message.channel.id
        const guildId = message.channel.guild.id

        const results = await db.oneOrNone(`
                SELECT guild_id, session_uuid, category_channel_id, feed_channel_id, controls_channel_id, is_open, has_started
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

        if (results) {
            if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                if (!results.has_started) {
                    if (results.is_open) {
                        try {
                            stopJoinMessage(results.session_uuid)

                            db.none(`
                                UPDATE pubquiz_sessions 
                                SET is_open = false
                                WHERE session_uuid = $1
                            `, [results.session_uuid])

                            message.reply("The Pubquiz was **closed successfully** and no new people can join.")
                        } catch (e) {
                            console.log(e)
                            message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
                        }
                    } else {
                        message.reply("The Pubquiz is **still closed**.")
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