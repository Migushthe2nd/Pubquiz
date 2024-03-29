const { util: { isFunction } } = require('klasa');
const PubCommand = require('../../PubCommand')
const { newPubquiz } = require('../../embeds')
const { v4 } = require('uuid');
const { db } = require('../../db')

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function generatePassword (length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

module.exports = class extends PubCommand {
	constructor(...args) {
		super(...args, {
			name: 'create',
			description: language => language.get('COMMAND_CREATE_DESCRIPTION'),
			usage: '[title:string{,50}] [description:string{,50}] [image:image]',
			examples: ['create', 'create "Epic Pubquiz" "The biggest Pubquiz for you guys yet!" ', 'create "The best Pubquiz"'],
			conditions: ['NO_ACTIVE_SESSION', 'IS_NOT_PARTICIPANT'],
			runIn: ['text'],
			requiredPermissions: ['MANAGE_GUILD', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS', 'MANAGE_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS', 'MANAGE_ROLES'],
			cooldown: 10,

			// args: [
			// 	{
			// 		key: 'title',
			// 		prompt: 'What title should this Pubquiz have? Respond with `default` for the default value (<name>\'s Pubquiz).',
			// 		type: 'string'
			// 	},
			// 	{
			// 		key: 'description',
			// 		prompt: 'How do you want to describe this Pubquiz? Respond with `default` for the default value (none).',
			// 		type: 'string'
			// 	},
			// 	{
			//         key: 'image',
			//         label: 'image url or upload',
			//         prompt: 'Do you want to show an image in the Pubquiz details? If so, send the url or upload an image, else respond with `default` to leave empty.',
			//         type: 'url',
			//         wait: 60
			// 	}
			// ]
		});

		// this.definePrompt('<title:string{,50}>', 'VUl het iN!')
	}

	async run (message, [title, description, image]) {
		const creatorId = message.author.id
		const creatorName = message.author.username
		const guildId = message.channel.guild.id

		let categoryChannel = null
		let feedChannel = null
		let controlsChannel = null
		try {
			// const quizmasterrole = await message.guild.roles.create({
			//     data: {
			//         name: 'Pubquiz Master',
			//         color: 'BLUE',
			//         permissions: [
			//             'MANAGE_MESSAGES',
			//             'KICK_MEMBERS'
			//         ]
			//     },
			//     reason: 'Pubquiz gestart',
			// })
			// await message.member.roles.add(quizmasterrole);

			categoryChannel = await message.guild.channels.create(title ? title : `${creatorName}'s Pubquiz`, {
				type: 'category',
				permissionOverwrites: [
					{
						id: message.guild.id,
						deny: ['VIEW_CHANNEL'],
					},
					{
						id: creatorId,
						allow: ['VIEW_CHANNEL'],
					}
				],
			})
			await categoryChannel.setPosition(0)

			await Promise.all([
				new Promise((resolve) => {
					message.guild.channels.create(`feed`, {
						type: 'text',
						permissionOverwrites: [
							{
								id: message.guild.id,
								allow: ['ADD_REACTIONS'],
								deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
							},
							{
								id: creatorId,
								allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
							}
						],
					}).then(createdChannel => {
						feedChannel = createdChannel
						feedChannel.setParent(categoryChannel.id)
						feedChannel.createOverwrite(guildId, {
							VIEW_CHANNEL: false,
							SEND_MESSAGES: false
						})
						resolve()
					})
				}),
				new Promise((resolve) => {
					message.guild.channels.create(`controls`, {
						type: 'text',
						permissionOverwrites: [
							{
								id: message.guild.id,
								deny: ['VIEW_CHANNEL'],
							},
							{
								id: creatorId,
								allow: ['VIEW_CHANNEL'],
							}
						],
					}).then(createdChannel => {
						controlsChannel = createdChannel
						controlsChannel.setParent(categoryChannel.id)
						resolve()
					})
				})
			])



			// // Send instrunctions for controls
			const help = await this.buildHelp(message)

			const categories = Object.keys(help);
			const { prefix } = message.guildSettings;
			const helpMessage = [];

			helpMessage.push(`**Prefix` + (message.guild !== null ? ` in ${message.guild.name}` : '') + `: \`${prefix}\`**`)
			for (let cat = 0; cat < categories.length; cat++) {
				helpMessage.push('\u200b');
				helpMessage.push(`**${categories[cat]} Commands**:`, '```asciidoc');
				const subCategories = Object.keys(help[categories[cat]]);
				for (let subCat = 0; subCat < subCategories.length; subCat++) helpMessage.push(`= ${subCategories[subCat]} =`, `${help[categories[cat]][subCategories[subCat]].join('\n')}\n`);
				helpMessage.push('```');
			}
			helpMessage.push('An example command order: `add` (add questions), `open` (allow people to join), `start` (close participartation and start the first question), `next` (next question), `end` (end the Pubquiz)')

			const helpMessages = await controlsChannel.send(helpMessage, { split: { char: '\u200b' } })

			const helpMessageIds = []
			helpMessages.forEach(message => {
				/* global BigInt */
				helpMessageIds.push(BigInt(message.id))
			})

			const pubquizData = await db.one(`
					INSERT INTO pubquiz (pubquiz_uuid, pubquiz_password, creator_id, creator_name, creator_avatarurl, title, description, image_url, created_time)
                    VALUES ($1, $2, $4, $12, $13, $10, $11, $14, NOW());
					
                    INSERT INTO pubquiz_sessions (pubquiz_uuid, session_uuid, creator_id, guild_id, category_channel_id, feed_channel_id, controls_channel_id, help_message_ids, title, description, created_time)
					VALUES ($1, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW());

					SELECT pubquiz_uuid, pubquiz_password, title, description, creator_avatarurl, image_url
					FROM pubquiz
					WHERE pubquiz_uuid = $1;
                `,
				[v4(), generatePassword(8), v4(), creatorId, guildId, categoryChannel.id, feedChannel.id, controlsChannel.id, helpMessageIds, title ? title : null, description ? description : null, creatorName, message.author.avatarURL({ dynamic: true, size: 32 }), image ? image : null]
			)

			message.reply("The Pubquiz was **created successfully**.")
			message.author.send({
				content: '**Your Pubquiz details:**',
				embed: newPubquiz(creatorName, pubquizData.creator_avatarurl, pubquizData.title, pubquizData.description, null, pubquizData.pubquiz_uuid, pubquizData.pubquiz_password, pubquizData.image_url)
			})
			// message.author.send(`**Your Pubquiz details:**
			// \`\`\`UUID: ${pubquizData.pubquiz_uuid}\nPassword: ${pubquizData.pubquiz_password}\`\`\`\nYou may share the UUID with others so that they can also use your Pubquiz. They will need to make a copy before they can edit the queue. \nUsing the password you can edit the Pubquiz either in Discord or onine (in the future).\nPubquizzes without questions will be removed after 7 days.
			// `)
		} catch (e) {
			console.log(e)
			if (feedChannel) feedChannel.delete()
			if (controlsChannel) controlsChannel.delete()
			if (categoryChannel) {
				await categoryChannel.children.forEach(channel => channel.delete());
				setTimeout(() => {
					categoryChannel.delete();
				}, 200)
			}

			db.none(`
					DELETE FROM pubquiz_participants
					WHERE session_uuid = (
						SELECT session_uuid
						FROM pubquiz_sessions
						WHERE creator_id = $1
					);

					DELETE FROM pubquiz_sessions
					WHERE creator_id = $1;
				`, [creatorId])
			message.reply("Something **went wrong** while trying to create a Pubquiz :/")
		}
	}

	async buildHelp (message) {
		const help = {};

		const commandNames = [...this.client.commands.keys()];
		const longest = commandNames.reduce((long, str) => Math.max(long, str.length), 0);

		await Promise.all(this.client.commands.map((command) =>
			this.client.inhibitors.run(message, command, true)
				.then(() => {
					if (command.category === 'Admin' || command.category === 'General') return;
					if (!has(help, command.category)) help[command.category] = {};
					if (!has(help[command.category], command.subCategory)) help[command.category][command.subCategory] = [];
					const description = isFunction(command.description) ? command.description(message.language) : command.description;
					help[command.category][command.subCategory].push(`${command.name.padEnd(longest)} :: ${description}`);
					if (command.usage && command.usage.usageString) help[command.category][command.subCategory].push(`\t${message.language.get('COMMAND_HELP_USAGE')}: ${command.usage.nearlyFullUsage}`)
					if (command.examples && command.examples.length > 0) help[command.category][command.subCategory].push(`\t${message.language.get('COMMAND_HELP_EXAMPLES')}: \n${command.examples.map(i => `\t - ${i}`).join('\n')}`)
				})
				.catch(() => {
					// noop
				})
		));

		return help;
	}
};