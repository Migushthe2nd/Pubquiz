const Discord = require("discord.js");
const Commando = require("discord.js-commando");
const path = require("path");
require('dotenv').config()
process.env.TZ = "Europe/Amsterdam";
const { resumeQuizes } = require("./events/resume");

const client = new Commando.Client({
	owner: "123859829453357056",
	commandPrefix: process.env.BOT_PREFIX,
});

client.Discord = Discord;

const activities_list = [
	{
		message: process.env.BOT_PREFIX + " help",
		type: "LISTENING",
	},
];

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
	let activityIndex = 0;
	setInterval(() => {
		client.user.setActivity(activities_list[activityIndex].message, {
			type: activities_list[activityIndex].type,
		});
		if (activityIndex === activities_list.length - 1) {
			activityIndex = 0;
		} else activityIndex++;
	}, 10000);

	// resume events
	resumeQuizes(client);
});

client.registry
	.registerGroups([
		["main", "General commands"],
		["queue", "Manage questions"],
	])
	.registerDefaults()
	.registerTypesIn(path.join(__dirname, "types"))
	.registerCommandsIn(path.join(__dirname, "commands"));

// const canUseCommand = (msg) => {
// 	return new Promise(resolve => {
// 		setTimeout(() => {
// 			resolve('5 seconds passed')
// 		}, 5000)
// 	})
// }

// client.dispatcher.addInhibitor(async msg => {
// 	if (true) {
// 		return {
// 			reason: 'cool',
// 			response: msg.reply(await canUseCommand(msg))
// 		};
// 	}
// });

// client.dispatcher.addInhibitor(msg => {
// 	if (true) {
// 		msg.reply("you must be a member to use my commands.")
// 			.then((replyMsg) => {
// 				if (true)
// 				return { reason: "User is not a member", response: replyMsg };
// 				else return { reason: "User is not a member", response: replyMsg[0] };
// 			})
// 			.catch((error) => error);
// 	}
// 	else return false
// });

// Block mention as prefix
// client.dispatcher.addInhibitor((msg) => {
// 	if (msg.content.startsWith(client.user.toString().replace('<@', '<@!')) && msg.isCommand) {
// 		return 'mention prefix disabled'
// 	} else return false
// });

client.on("message", (msg) => {
	if (msg.author.bot) return;
	if (
		!msg.content.startsWith(client.user.toString().replace("<@", "<@!")) &&
		msg.isCommand
	)
		return;

	// const bericht = msg.content;
	// const berichtNoCaps = msg.content.toLowerCase();
	// Custom message actions
});

client.login(process.env.BOT_TOKEN);