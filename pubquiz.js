require('dotenv').config()
process.env.TZ = "Europe/Amsterdam";
const { setActivities, resumeQuizes } = require("./resume/quizes");
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

client.on("klasaReady", () => {
	// Set active pubquizzes as status
	setActivities(client)

	// resume events
	resumeQuizes(client);
});

client.login(process.env.BOT_TOKEN);