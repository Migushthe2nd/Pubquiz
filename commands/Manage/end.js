const PubCommand = require('../../PubCommand')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'end',
            description: 'Stop the quiz and remove all Pubquiz-related channels.',
            runIn: ['text'],
            usage: '<confirm:boolean>',
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL'],
            cooldown: 1,

            // args: [
            //     {
            //         key: 'confirm',
            //         prompt: 'This will remove all Pubquiz-related channels. Are you sure? Respond with `yes` or `no`.',
            //         type: 'string',
            //         oneOf: ['yes', 'no']
            //     }
            // ]
        });
    }

    async run (message, [confirm]) {
        if (confirm) {
            const guildId = message.channel.guild.id

            try {
                const categoryChannel = await this.client.guilds.cache.get(guildId).channels.cache.get(message.resolved.session.category_channel_id);
                if (categoryChannel) {
                    await categoryChannel.children.forEach(channel => channel.delete())
                    setTimeout(() => {
                        categoryChannel.delete();
                    }, 200)
                    db.none(`
                        -- DELETE FROM pubquiz_scores
                        -- WHERE session_uuid = $1;

                        DELETE FROM pubquiz_participants
                        WHERE session_uuid = $1;
        
                        DELETE FROM pubquiz_sessions
                        WHERE session_uuid = $1;
                    `, [message.resolved.session.session_uuid])
                } else {
                    message.reply("The category has **already been removed** :/")
                }
            } catch (e) {
                console.log(e)
                message.reply("Something **went wrong** while trying to end the Pubquiz :/")
            }
        }
    }
};