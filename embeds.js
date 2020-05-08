const Discord = require("discord.js");
const global = {
    color: '#FF0044'
}

const fancyTimeFormat = time => {
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";
    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

exports.quizDetails = (title, description, creator, participants, placesLeft, openedTime, imageUrl, closed) => {
    // Een optie is om hier de previous message mee te geven zodat automatisch de oude waarde gebruikt kan worden waarneer niet gegeven
    let embed = new Discord.MessageEmbed()
        .setColor(global.color)
        .setAuthor(creator.username, typeof creator.avatarURL === 'function' ? creator.avatarURL({ dynamic: true, size: 32 }) : creator.avatarURL)

    if (title)
        embed.setTitle(title)
    else
        embed.setTitle(`${creator.username}'s Pubquiz`)

    if (description)
        embed.setDescription(description)

    // Test many people
    // if (!participants) participants = []
    // for (let step = 0; step < 40; step++) {
    //     participants.push(Math.floor(Math.random() * 99999999999999))
    // }

    if (participants && participants.length > 0) {
        // 6 fields won't exceed 6000 char limit
        const participantsStrings = ['', '', '', '', '', '']
        let andMore = false
        for (let p = 0; p < participants.length; p++) {
            let appended = false
            for (let f = 0; f < participantsStrings.length; f++) {
                // Max message length: 900
                if (participantsStrings[f].length < 900 && !appended) {
                    participantsStrings[f] += `<@!${participants[p]}>` + (participants[p + 1] ? ', ' : '')
                    appended = true
                } else if (!appended) {
                    if (!andMore && f === participantsStrings.length - 1 && participants[participants.length - 1] !== participants[p]) {
                        andMore = true
                        break;
                    }
                }
            }
            if (andMore) { break; }
        }

        for (let f = 0; f < participantsStrings.length; f++) {
            if (f === participantsStrings.length - 1 && andMore) {
                embed.addField(`Participants (${participants.length}, ${placesLeft > 0 ? placesLeft : 0} slots left)`, participantsStrings[f] + '\nAnd more...')
                break;
            } else if (participantsStrings[f] !== '') {
                embed.addField(`Participants (${participants.length}, ${placesLeft > 0 ? placesLeft : 0} slots left)`, participantsStrings[f])
            }
        }
    }

    if (!closed)
        embed.addField("How to join", "*Click :raised_hand: to join this Pubquiz*")
    else
        embed.addField("How to join", "*Participation closed*")

    embed.addField("How to play", "When a question starts, it is sent here. You may answer in the text channel created for you. The host can see these and optionally review them.")
    // embed.addField("How to play", "When a question starts, it is sent here. You may answer in the text channel created for you. The host can see these and optionally review them. Modified messages will not be reviewed.")

    if (imageUrl)
        embed.setThumbnail(imageUrl)

    if (openedTime)
        embed.setTimestamp(openedTime)
    else
        embed.setTimestamp()

    // ~ 310 (max) chars over in embed voor andere dingen (met titel, description: max 50 char per -> 200 over)

    return embed
}

exports.questionNew = (questionNr, description, creator, imageUrl, endTime) => {
    // Een optie is om hier de previous message mee te geven zodat automatisch de oude waarde gebruikt kan worden waarneer niet gegeven
    let embed = new Discord.MessageEmbed()
        .setColor(global.color)
        .setAuthor(creator.username, typeof creator.avatarURL === 'function' ? creator.avatarURL({ dynamic: true, size: 32 }) : creator.avatarURL)
        .setTitle(`Question ${questionNr}`)
        .addField("How to respond", "Send you answers in your own channel")
        .setTimestamp()

    const message = { embed }

    if (description)
        embed.setDescription(description)

    if (endTime && endTime.getTime() > new Date().getTime())
        embed.addField("Countdown", `${fancyTimeFormat((endTime.getTime() - new Date().getTime()) / 1000)} minutes left`)
    else if (endTime === false)
        embed.addField("Countdown", "The time has expired!")

    if (questionNr && questionNr <= 99) {
        // digitImage = new Discord.MessageAttachment(`./images/digits/${questionNr}.png`, `${questionNr}.png`)
        // message.files = [digitImage]
        embed.setThumbnail(`https://bonteknaagkever.ga/files/digits/${questionNr}.png`)
    }

    if (imageUrl)
        embed.setImage(imageUrl)

    return message
}

exports.answerDividerAbove = (questionNr, description, participantId) => {
    let embed = new Discord.MessageEmbed()
        .setColor(global.color)
        .setTitle(`Answer ${questionNr} above ☝️`)

    if (description)
        embed.setDescription(description)

    embed.addField("Participant", `<@!${participantId}>`)

    return embed
}

exports.newPubquiz = (creatorName, creatorAvatarURL, title, description, questionAmount, uuid, password, imageUrl) => {
    let embed = new Discord.MessageEmbed()
        .setColor(global.color)
        .setAuthor(creatorName, creatorAvatarURL)
        .setTimestamp()

    if (title)
        embed.setTitle(title)
    else
        embed.setTitle(`${creatorName}'s Pubquiz`)

    if (description)
        embed.setDescription(description)

    if (questionAmount)
        embed.addField("Question amount", questionAmount)

    if (imageUrl)
        embed.setThumbnail(imageUrl)

    if (uuid)
        embed.addField(`UUID`, `\`${uuid}\``)

    if (password)
        embed.addField(`Password`, `\`${password}\``)

    if (uuid || password)
        embed.addField('\u200B', 'You may share the UUID with others so that they can also use your Pubquiz. In the future they will be able to edit it if they make a copy. \nUsing the password you or others may be able to edit the Pubquiz online in the future.\nPubquizzes without questions will be removed after 7 days.')

    return embed
}