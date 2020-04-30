const commando = require('discord.js-commando');
const { pgp, db } = require('../../db')

module.exports = class UserInfoCommand extends commando.Command {
    constructor(client) {
        super(client, {
            name: 'end',
            aliases: [],
            group: 'main',
            memberName: 'end',
            description: 'Stop the quiz and remove all Pubquiz-related channels.',
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

            const results = await db.oneOrNone(`
                    SELECT guild_id, category_channel_id, controls_channel_id, session_uuid
                    FROM pubquiz_sessions
                    WHERE creator_id = $1;
                `, [creatorId])

            if (results) {
                if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                    try {
                        const categoryChannel = await this.client.guilds.cache.get(guildId).channels.cache.get(results.category_channel_id);
                        if (results.guild_id === guildId && categoryChannel) {
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
                            `, [results.session_uuid])
                        } else {
                            message.reply("The category has **already been removed** :/")
                        }
                    } catch (e) {
                        console.log(e)
                        message.reply("Something **went wrong** while trying to end the Pubquiz :/")
                    }
                } else {
                    message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
                }
            } else {
                message.reply("You **haven't started** a Pubquiz yet.")
            }
        }
    }
};