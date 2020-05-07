const PubCommand = require('../../PubCommand')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'show',
            description: 'Make the Pubquiz visible in the server.',
            runIn: ['text'],
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL'],
            cooldown: 5,
        });
    }

    async run (message) {
        const guildId = message.channel.guild.id

        try {
            const feedChannel = await message.channel.guild.channels.cache.get(message.resolved.session.feed_channel_id)

            // Add guild permissions for viewing
            feedChannel.updateOverwrite(guildId, {
                VIEW_CHANNEL: true
            })

            message.reply("The Pubquiz was **shown successfully**!")
        } catch (e) {
            console.log(e)
            message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
        }
    }
};