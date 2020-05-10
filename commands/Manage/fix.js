const PubCommand = require('../../PubCommand')
const { stopJoinMessage } = require('../../resume/watch_message')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'fix',
            description: language => language.get('COMMAND_FIX_DESCRIPTION'),
            runIn: ['text'],
            usage: '<confirm:boolean>',
            requiredPermissions: ['MANAGE_GUILD', 'VIEW_CHANNEL', 'SEND_MESSAGES'],
            conditions: [],
            cooldown: 10,

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
            const creatorId = message.author.id
            const guildId = message.channel.guild.id

            try {
                const results = await db.any(`
                    DELETE FROM pubquiz_participants
                    WHERE session_uuid IN (
                        SELECT session_uuid
                        FROM pubquiz_sessions
                        WHERE creator_id = $1
                    );

                    DELETE FROM pubquiz_sessions
                    WHERE creator_id = $1
                    RETURNING session_uuid, category_channel_id;
                `, [creatorId])
                if (results && results.length > 0) {
                    results.forEach(async result => {
                        stopJoinMessage(result.session_uuid)

                        const categoryChannel = await this.client.guilds.cache.get(guildId).channels.cache.get(result.category_channel_id);

                        if (categoryChannel) {
                            await categoryChannel.children.forEach(channel => channel.delete())
                            setTimeout(() => {
                                categoryChannel.delete();
                            }, 200)
                        }
                    })
                    message.reply("You should be able to create a Pubquiz now.")
                } else {
                    message.reply("There didn't seem to be leftover session data.")
                }
            } catch (e) {
                console.log(e)
                message.reply("Something **went wrong** while trying to fix your problems :/")
            }
        }
    }
};