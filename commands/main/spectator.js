const { Command } = require('klasa');
const { db } = require('../../db')

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            name: 'spectator',
            description: 'Toggle spectator for a user. This will allow them to view the answers channels, unlike just keeping the Pubquiz visible.',
            runIn: ['text'],
            usage: '<member:member>',

            // args: [
            //     {
            //         key: 'member',
            //         prompt: 'Which member do you wan\'t to add as spectator?',
            //         type: 'member'
            //     }
            // ]
        });
    }

    async run (message, [member]) {
        const creatorId = message.author.id
        const guildId = message.channel.guild.id

        const results = await db.oneOrNone(`
                SELECT guild_id, category_channel_id, controls_channel_id, creator_id, participants, spectators, session_uuid
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

        if (results) {
            if (results.guild_id === guildId) {
                if (results.creator_id !== member.id) {
                    const categoryChannel = await this.client.guilds.cache.get(guildId).channels.cache.get(results.category_channel_id);
                    if (results.participants ? !results.participants.includes(member.id) : true) {
                        if (results.spectators ? !results.spectators.includes(member.id) : true) {
                            try {
                                db.none(`
                                    UPDATE pubquiz_sessions
                                    SET spectators = array_append(spectators, $2)
                                    WHERE session_uuid = $1
                                `, [results.session_uuid, member.id])

                                await categoryChannel.children.forEach(channel => {
                                    if (channel.id !== results.controls_channel_id) {
                                        channel.updateOverwrite(member, {
                                            VIEW_CHANNEL: true,
                                            SEND_MESSAGES: false,
                                            ADD_REACTIONS: false
                                        })
                                    }
                                })
                                message.reply(`${member} **successfully added** as spectator!`)
                            } catch (e) {
                                console.log(e)
                                message.reply("Something **went wrong** while trying to add that user as spectator :/")
                            }
                        } else {
                            try {
                                db.none(`
                                    UPDATE pubquiz_sessions
                                    SET spectators = array_remove(spectators, $2)
                                    WHERE session_uuid = $1
                                `, [results.session_uuid, member.id])

                                await categoryChannel.children.forEach(channel => {
                                    if (channel.id !== results.controls_channel_id) {
                                        channel.permissionOverwrites.get(member.id).delete();
                                    }
                                })
                                message.reply(`${member} **successfully removed** as spectator!`)
                            } catch (e) {
                                console.log(e)
                                message.reply("Something **went wrong** while trying to remove that user as spectator :/")
                            }
                        }
                    } else {
                        message.reply("That user is **a participant**.")
                    }
                } else {
                    message.reply("You **can't add** yourself as spectator ;)")
                }
            } else {
                message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id)}.`)
            }
        } else {
            message.reply("You **haven't created** a Pubquiz yet.")
        }
    }
};