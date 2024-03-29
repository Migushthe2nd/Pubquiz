const PubCommand = require('../../PubCommand')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'show',
            description: language => language.get('COMMAND_SHOW_DESCRIPTION'),
            runIn: ['text'],
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_ROLES'],
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