const { Command } = require('klasa');
const { db } = require('../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'clearchat',
            runIn: ['text'],
            description: 'Remove all messages in #feed or #controls depending on where you use it. Does not remove the join and help messages.',
            usage: '<confirm:boolean>',
            promptLimit: true

            // args: [
            //     {
            //         key: 'confirm',
            //         prompt: 'This will remove all messages in #feed or #controls except the join message. Are you sure? Respond with `yes` or `no`.',
            //         type: 'string',
            //         oneOf: ['yes', 'no']
            //     }
            // ]
        });
    }

    async run (message, [confirm]) {
        if (confirm) {
            const creatorId = message.author.id
            const channelId = message.channel.id
            const guildId = message.channel.guild.id

            const results = await db.oneOrNone(`
                SELECT *
                FROM pubquiz_sessions
                WHERE creator_id = $1
            `, [creatorId])

            if (results) {
                if (results.guild_id === guildId) {
                    if (results.feed_channel_id === channelId) {
                        try {
                            let fetched;
                            do {
                                fetched = await message.channel.messages.fetch({ limit: 100 })
                                // Delete all messages except the join message
                                message.channel.bulkDelete(fetched.filter(message => message.id !== results.join_message_id));
                            }
                            while (fetched.size >= 2);
                        } catch (e) {
                            console.log(e)
                            message.reply("Something went **wrong while** trying to delete all messages :/")
                        }
                    } else if (results.controls_channel_id === channelId) {
                        try {
                            let fetched;
                            do {
                                fetched = await message.channel.messages.fetch({ limit: 100 })
                                // Delete all messages except the join message
                                message.channel.bulkDelete(fetched.filter(message => !results.help_message_ids.includes(message.id)));
                            }
                            while (fetched.size >= 3);
                        } catch (e) {
                            console.log(e)
                            message.reply("Something **went wrong** while trying to delete all messages :/")
                        }
                    } else {
                        message.reply(`You may only use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.feed_channel_id)} and ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
                    }
                } else {
                    message.reply(`You must use this command in either ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.feed_channel_id)} or ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
                }
            } else {
                message.reply("You **haven't created** a Pubquiz yet.")
            }
        }
    }
};