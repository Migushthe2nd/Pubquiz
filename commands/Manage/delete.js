const PubCommand = require('../../PubCommand')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'delete',
            description: 'Delete a Pubquiz by UUID. Active quizes will be stopped if forced. This will remove questions. If you wish to keep those, use the end command to end the Pubquiz. Only the original creator of the Pubquiz is able to use this command.',
            usage: '[UUID:uuid] <confirm:boolean|force>',
            examples: ['delete yes', 'delete e52cf51d-1ae1-417c-a42e-f7e096d07d21 yes'],
            conditions: [],
            cooldown: 1,

            // args: [
            //     {
            //         key: 'uuid',
            //         label: 'UUID',
            //         prompt: 'Enter the UUID of the Pubquiz you wish to delete. Respond with `default` to use the active quiz.',
            //         type: 'uuid_or_default'
            //     },
            //     {
            //         key: 'confirm',
            //         prompt: 'This will remove all Pubquiz-related data. This will also remove the questions. If you wish to keep those, use the end command. Are you sure? Respond with `yes` or `no`.',
            //         type: 'string',
            //         oneOf: ['yes', 'no', 'force']
            //     }
            // ]
        });
    }

    async run (message, [UUID, confirm]) {
        if (confirm) {
            const creatorId = message.author.id

            const creatorSession = await db.oneOrNone(`
                SELECT session_uuid, pubquiz_uuid, guild_id, feed_channel_id, category_channel_id
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

            if (!UUID) {
                if (creatorSession)
                    UUID = creatorSession.pubquiz_uuid
                else return message.reply(`You **haven't started** a Pubquiz yet.`)
            }

            const doesExist = await db.oneOrNone(`
                SELECT creator_id
                FROM pubquiz
                WHERE pubquiz_uuid = $1;
            `, [UUID])

            if (doesExist) {
                if (doesExist.creator_id === creatorId) {
                    const otherSessions = await db.any(`
                        SELECT guild_id, feed_channel_id, category_channel_id
                        FROM pubquiz_sessions
                        WHERE pubquiz_uuid = $2
                            AND session_uuid != $1
                    `, [creatorSession ? creatorSession.session_uuid : null, UUID])

                    if (!otherSessions.length > 0 || confirm === 'force') {
                        // Combine all sessions to remove a bit of duplicate code
                        if (creatorSession)
                            otherSessions.push(creatorSession)
                        try {
                            // End sessions
                            otherSessions.forEach(async session => {
                                try {
                                    const categoryChannel = await this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.category_channel_id);
                                    const feedChannel = await this.client.guilds.cache.get(session.guild_id).channels.cache.get(session.feed_channel_id)
                                    if (categoryChannel) {
                                        if (feedChannel && session.session_uuid !== creatorSession.session_uuid) {
                                            feedChannel.send("@here, The original creator of the Pubquiz you are using has force-deleted the data related to it. Because of that, this Pubquiz will be ended in 20 seconds. I'm sorry.")
                                            setTimeout(async () => {
                                                await categoryChannel.children.forEach(channel => channel.delete())
                                                setTimeout(() => {
                                                    categoryChannel.delete();
                                                }, 200)
                                            }, 20000)
                                        } else {
                                            await categoryChannel.children.forEach(channel => channel.delete())
                                            setTimeout(() => {
                                                categoryChannel.delete();
                                            }, 200)
                                        }
                                    }
                                } catch (e) {
                                    console.log(e)
                                }
                            })


                            db.none(`
                                -- DELETE FROM pubquiz_scores
                                -- WHERE session_uuid = $1;

                                DELETE FROM pubquiz_participants
                                WHERE session_uuid = (
                                    SELECT session_uuid
                                    FROM pubquiz_sessions
                                    WHERE pubquiz_uuid = $1
                                );
                
                                DELETE FROM pubquiz_sessions
                                WHERE pubquiz_uuid = $1;

                                DELETE FROM pubquiz_questions
                                WHERE pubquiz_uuid = $1;

                                DELETE FROM pubquiz
                                WHERE pubquiz_uuid = $1
                            `, [UUID])

                            message.reply("Pubquiz data **successfully deleted**.")
                        } catch (e) {
                            console.log(e)
                            message.reply("Something **went wrong** while trying to delete the Pubquiz :/")
                        }
                    } else {
                        message.reply("There seem to be other people playing this Pubquiz. Removing this Pubquiz will stop theirs. If you are really sure, instead of `yes` answer with `force`")
                    }
                } else {
                    message.reply("You are not the original creator of this pubquiz, so you cannot delete it.")
                }
            } else {
                message.reply("That Pubquiz **doesn't exist**.")
            }
        }
    }
};