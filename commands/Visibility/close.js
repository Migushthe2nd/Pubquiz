const PubCommand = require('../../PubCommand')
const { stopJoinMessage } = require('../../resume/watch_message')
const { db } = require('../../db')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'close',
            runIn: ['text'],
            description: 'Close participation.',
            promptLimit: true,
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'HAS_NOT_STARTED', 'IS_OPEN'],
            cooldown: 5,
        });
    }

    async run (message) {
        try {
            stopJoinMessage(message.resolved.session.session_uuid)

            db.none(`
                UPDATE pubquiz_sessions 
                SET is_open = false
                WHERE session_uuid = $1
            `, [message.resolved.session.session_uuid])

            message.reply("The Pubquiz was **closed successfully** and no new people can join.")
        } catch (e) {
            console.log(e)
            message.reply("Something **went wrong** while trying to open the Pubquiz for people to join :/")
        }
    }
};