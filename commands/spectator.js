const PubCommand = require('../PubCommand')
const { db } = require('../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'spectator',
            description: 'Toggle spectator for a user. This will allow them to view the answers channels, unlike just keeping the Pubquiz visible.',
            runIn: ['text'],
            examples: ['spectator @member1', 'spectator @member1 @member2 @member3'],
            usage: '<member:member> [...]',
            cooldown: 1,

            // args: [
            //     {
            //         key: 'member',
            //         prompt: 'Which member do you wan\'t to add as spectator?',
            //         type: 'member'
            //     }
            // ]
        });
    }

    async run (message, [...members]) {
        const creatorId = message.author.id
        const guildId = message.channel.guild.id

        const results = await db.oneOrNone(`
                SELECT guild_id, category_channel_id, controls_channel_id, creator_id, participants, spectators, session_uuid
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

        if (results) {
            if (results.guild_id === guildId) {
                const allResponses = []
                const allPromises = []
                const categoryChannel = this.client.guilds.cache.get(guildId).channels.cache.get(results.category_channel_id);
                members.forEach(member => {
                    // eslint-disable-next-line no-async-promise-executor
                    const promise = new Promise(async resolve => {
                        if (results.creator_id !== member.id) {
                            if (results.participants ? !results.participants.includes(member.id) : true) {
                                if (results.spectators ? !results.spectators.includes(member.id) : true) {
                                    try {
                                        db.none(`
                                            UPDATE pubquiz_sessions
                                            SET spectators = array_append(spectators, $2)
                                            WHERE session_uuid = $1
                                                AND NOT (spectators @> ARRAY[$2::bigint]);
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
                                        allResponses.push(`${member} **successfully added** as spectator!`)
                                        resolve()
                                    } catch (e) {
                                        console.log(e)
                                        allResponses.push(`Something **went wrong** while trying to add ${member} as spectator :/`)
                                        resolve()
                                    }
                                } else {
                                    try {
                                        db.none(`
                                            UPDATE pubquiz_sessions
                                            SET spectators = array_remove(spectators, $2)
                                            WHERE session_uuid = $1
                                                -- AND (spectators @> ARRAY[$2::bigint]);
                                        `, [results.session_uuid, member.id])

                                        await categoryChannel.children.forEach(channel => {
                                            if (channel.id !== results.controls_channel_id) {
                                                channel.permissionOverwrites.get(member.id).delete();
                                            }
                                        })
                                        allResponses.push(`${member} **successfully removed** as spectator!`)
                                        resolve()
                                    } catch (e) {
                                        console.log(e)
                                        allResponses.push(`Something **went wrong** while trying to remove ${member} as spectator :/`)
                                        resolve()
                                    }
                                }
                            } else {
                                allResponses.push(`${member} is **a participant**.`)
                                resolve()
                            }
                        } else {
                            allResponses.push(`You **can't add** yourself as spectator ;)`)
                            resolve()
                        }
                    })
                    allPromises.push(promise)
                })
                await Promise.all(allPromises);
                message.reply(allResponses, { split: true })
            } else {
                message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id)}.`)
            }
        } else {
            message.reply("You **haven't created** a Pubquiz yet.")
        }
    }
};