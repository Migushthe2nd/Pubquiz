const { Command } = require('klasa');
const { db } = require('../../../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'removeall',
            description: 'Remove all questions from the queue.',
            runIn: ['text'],
            usage: '<confirm:boolean>',
            cooldown: 10,

            // args: [
            //     {
            //         key: 'confirm',
            //         prompt: 'This will remove all questions. Are you sure? Respond with `yes` or `no`.',
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

                if (results.guild_id === guildId && results.controls_channel_id === channelId) {
                    const pubquiz = await db.oneOrNone(`
                        SELECT *
                        FROM pubquiz
                        WHERE pubquiz_uuid = $1
                            AND creator_id = $2
                    `, [results.pubquiz_uuid, creatorId])
                    if (results.creator_id === pubquiz.creator_id) {
                        try {
                            db.none(`
                            DELETE FROM pubquiz_questions
                            WHERE pubquiz_uuid = $1;
                        `, [results.pubquiz_uuid])
                        } catch (e) {
                            console.log(e)
                            message.reply("Something **went wrong** while trying to delete all messages :/")
                        }
                    } else {
                        message.reply("You are **not the original creator** of this pubquiz, so you cannot modify the questions. You may use the copy command to enable editing.")
                    }
                } else {
                    message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
                }
            } else {
                message.reply("You **haven't created** a Pubquiz yet.")
            }
        }
    }
};