const { Command } = require('klasa');
const { db } = require('../../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'hide',
            description: 'Hide the Pubquiz for non-participants.',
            runIn: ['text'],
        });
    }

    async run (message) {
        const creatorId = message.author.id
        const channelId = message.channel.id
        const guildId = message.channel.guild.id

        const results = await db.oneOrNone(`
            SELECT guild_id, feed_channel_id, controls_channel_id, participants
            FROM pubquiz_sessions
            WHERE creator_id = $1;
        `, [creatorId])

        if (results) {
            if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                try {
                    const feedChannel = await message.channel.guild.channels.cache.get(results.feed_channel_id)

                    // Take guild permissions for viewing
                    feedChannel.updateOverwrite(guildId, {
                        VIEW_CHANNEL: false
                    })

                    message.reply("The Pubquiz was **hidden successfully**!")
                } catch (e) {
                    console.log(e)
                    message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
                }
            } else {
                message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
            }
        } else {
            message.reply("You **haven't created** a Pubquiz yet.")
        }
    }
};