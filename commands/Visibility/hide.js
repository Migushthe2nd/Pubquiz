const PubCommand = require('../../PubCommand')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'hide',
            description: 'Hide the Pubquiz for non-participants.',
            runIn: ['text'],
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL'],
            cooldown: 5,
        });
    }

    async run (message) {
        const guildId = message.channel.guild.id

        try {
            const feedChannel = await message.channel.guild.channels.cache.get(message.resolved.session.feed_channel_id)

            // Take guild permissions for viewing
            feedChannel.updateOverwrite(guildId, {
                VIEW_CHANNEL: false
            })

            message.reply("The Pubquiz was **hidden successfully**!")
        } catch (e) {
            console.log(e)
            message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
        }
    }
};