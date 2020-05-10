const PubCommand = require('../../PubCommand')

module.exports = class extends PubCommand {
    constructor(...args) {
        super(...args, {
            name: 'list',
            aliases: ['questions', 'queue'],
            description: language => language.get('COMMAND_LIST_DESCRIPTION'),
            runIn: ['text'],
            conditions: ['ACTIVE_SESSION', 'CONTROLS_CHANNEL', 'HAS_QUESTIONS'],
            requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            cooldown: 2,
        });
    }

    async run (message) {
        let fullString = "__All questions:__"
        message.resolved.questions.forEach(question => {
            fullString += '\n'
                + (question.description ?
                    `\n__**Question ${question.question_nr}**:__ *${question.description}*` :
                    `\n__**Question ${question.question_nr}**__`
                ) + (
                    question.question_nr < message.resolved.session.question_nr
                        || (question.question_nr === message.resolved.session.question_nr && !message.resolved.session.is_active)
                        ? ' (finished)'
                        : (question.question_nr === message.resolved.session.question_nr && message.resolved.session.is_active)
                            ? ' (current)'
                            : ''
                )
                + (question.countdown ? `\n**\tSeconds:** ${question.countdown}` : '')
                + (question.points ? `\n**\tPoints:** ${question.points}` : '')
                + (question.image_url ? `\n**\tImage Url:** <${question.image_url}>` : '')
                + (question.video_url ? `\n**\tVideo Url:** <${question.video_url}>` : '')
        })

        message.channel.send(fullString, { split: true })
    }
}