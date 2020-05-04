require('dotenv').config()
process.env.TZ = "Europe/Amsterdam";
const { resumeQuizes } = require("./resume/quizes");
const { Client } = require('klasa');

const client = new Client({
	fetchAllMembers: false,
	prefix: process.env.BOT_PREFIX,
	commandEditing: false,
	typing: true,
	createPiecesFolders: false,
	noPrefixDM: true,
	ownerID: "123859829453357056",
	pieceDefaults: {
		commands: {
			promptLimit: true,
			quotedStringSupport: true,
			usageDelim: ' '
		}
	},
	readyMessage: (client) => `Successfully initialized as '${client.user.tag}'. Ready to serve ${client.guilds.cache.size} guilds.`
})

const activities_list = [
	{
		message: process.env.BOT_PREFIX + " help",
		type: "LISTENING",
	},
];

client.on("klasaReady", () => {

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

client.login(process.env.BOT_TOKEN);

// client.on("message", (msg) => {
// 	if (msg.author.bot) return;
// 	if (
// 		!msg.content.startsWith(client.user.toString().replace("<@", "<@!")) &&
// 		msg.isCommand
// 	)
// 		return;

// 	// const bericht = msg.content;
// 	// const berichtNoCaps = msg.content.toLowerCase();
// 	// Custom message actions
// });