const commando = require('discord.js-commando');
const { stopJoinMessage } = require('../../events/watch_message')
const { pgp, db } = require('../../db')

module.exports = class UserInfoCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'fix',
            aliases: [],
            group: 'main',
            memberName: 'fix',
            description: 'You might have to use this command if you removed Pubquiz-related channels manually. If you are unable to create a Pubquiz, try this. This will try to remove all Pubquiz-related channels and data.',
            guildOnly: true,

            args: [
                {
                    key: 'confirm',
                    prompt: 'This will remove all Pubquiz-related channels. Are you sure? Respond with `yes` or `no`.',
                    type: 'string',
                    oneOf: ['yes', 'no']
                }
            ]
        });
    }

    async run (message, { confirm }) {
        if (confirm === 'yes') {
            const creatorId = message.author.id
            const creatorName = message.author.username
            const channelId = message.channel.id
            const guildId = message.channel.guild.id

            try {
                const results = await db.oneOrNone(`
                    DELETE FROM pubquiz_participants
                    WHERE session_uuid = (
                        SELECT session_uuid
                        FROM pubquiz_sessions
                        WHERE creator_id = $1
                    );

                    DELETE FROM pubquiz_sessions
                    WHERE creator_id = $1
                    RETURNING session_uuid, category_channel_id;
                `, [creatorId])
                if (results) {
                    stopJoinMessage(results.session_uuid)
                    
                    const categoryChannel = await this.client.guilds.cache.get(guildId).channels.cache.get(results.category_channel_id);
                    if (categoryChannel) {
                        await categoryChannel.children.forEach(channel => channel.delete())
                        setTimeout(() => {
                            categoryChannel.delete();
                        }, 200)
                    }
                }
                message.reply("You should be able to create a Pubquiz now.")
            } catch (e) {
                console.log(e)
                message.reply("Something **went wrong** while trying to fix your problems :/")
            }
        }
    }
};