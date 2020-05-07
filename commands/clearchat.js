const PubCommand = require('../PubCommand')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'clearchat',
            runIn: ['text'],
            description: 'Remove all messages in #feed or #controls depending on where you use it. Does not remove the join and help messages.',
            usage: '<confirm:boolean>',
            promptLimit: true,
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL_OR_FEED_CHANNEL'],
            cooldown: 5,

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
            const channelId = message.channel.id
            if (message.resolved.session.feed_channel_id === channelId) {
                try {
                    let fetched;
                    do {
                        fetched = await message.channel.messages.fetch({ limit: 100 })
                        // Delete all messages except the join message
                        message.channel.bulkDelete(fetched.filter(msg => msg.id !== message.resolved.session.join_message_id));
                    }
                    while (fetched.size >= 2);
                } catch (e) {
                    console.log(e)
                    message.reply("Something went **wrong while** trying to delete all messages :/")
                }
            } else if (message.resolved.session.controls_channel_id === channelId) {
                try {
                    let fetched;
                    do {
                        fetched = await message.channel.messages.fetch({ limit: 100 })
                        // Delete all messages except the join message
                        message.channel.bulkDelete(fetched.filter(msg => !message.resolved.session.help_message_ids.includes(msg.id)));
                    }
                    while (fetched.size >= 3);
                } catch (e) {
                    console.log(e)
                    message.reply("Something **went wrong** while trying to delete all messages :/")
                }
            }
        }
    }
};