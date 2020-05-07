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
            conditions: ['ACTIVE_SESSION', 'CORRECT_GUILD'],
            requiredPermissions: ['MANAGE_GUILD', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_ROLES'],
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
        const guildId = message.channel.guild.id

        const allResponses = []
        const allPromises = []
        const categoryChannel = this.client.guilds.cache.get(guildId).channels.cache.get(message.resolved.session.category_channel_id);
        members.forEach(member => {
            // eslint-disable-next-line no-async-promise-executor
            const promise = new Promise(async resolve => {
                if (message.resolved.session.creator_id !== member.id) {
                    if (message.resolved.session.participants ? !message.resolved.session.participants.includes(member.id) : true) {
                        if (message.resolved.session.spectators ? !message.resolved.session.spectators.includes(member.id) : true) {
                            try {
                                db.none(`
                                    UPDATE pubquiz_sessions
                                    SET spectators = array_append(spectators, $2)
                                    WHERE session_uuid = $1
                                        AND NOT (spectators @> ARRAY[$2::bigint]);
                                `, [message.resolved.session.session_uuid, member.id])

                                await categoryChannel.children.forEach(channel => {
                                    if (channel.id !== message.resolved.session.controls_channel_id) {
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
                                `, [message.resolved.session.session_uuid, member.id])

                                await categoryChannel.children.forEach(channel => {
                                    if (channel.id !== message.resolved.session.controls_channel_id) {
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
    }
};