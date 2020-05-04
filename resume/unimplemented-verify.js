// exports.mayManageQuiz = async (message, creatorId) => {
//     const results = await db.oneOrNone(`
//                 SELECT *
//                 FROM pubquiz
//                 WHERE creator_id = $1
//             `, [creatorId])

//     if (results) {
//         if (channelId === results.controls_channel_id) {
//             return true
//         } else {
//             message.reply(`You must use this command in ${this.client.guilds.cache.get(results.guild_id).channels.cache.get(results.controls_channel_id)}.`)
//             return false
//         }
//     } else {
//         message.reply("You haven't started a Pubquiz yet.")
//         return false
//     }
// }

// exports.mayStartNextQuestion = async (message, creatorId) => {
//     const hasParticipantsOrNotFinished = await db.oneOrNone(`
//         SELECT countdown_endtime, participants
//         FROM pubquiz
//         WHERE creator_id = $1
//     `, [creatorId])

//     if (hasParticipantsOrNotFinished.participants && hasParticipantsOrNotFinished.participants.length > 0) {
//         if (hasParticipantsOrNotFinished.countdown_endtime < new Date().getTime()) {
//             return true
//         } else {
//             message.reply(`Another question is still active.`)
//             return false
//         }
//     } else {
//         message.reply(`The Pubquiz has no participants yet.`)
//         return false
//     }
// }