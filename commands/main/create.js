const commando = require('discord.js-commando');
const { newPubquiz } = require('../../embeds')
const { v4 } = require('uuid');
const { pgp, db } = require('../../db')

function generatePassword (length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

module.exports = class UserInfoCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'create',
			aliases: [],
			group: 'main',
			memberName: 'create',
			description: 'Create a new Pubquiz.',
			examples: ['create', 'create "Epic Pubquiz" "The biggest Pubquiz for you guys yet!"', 'create "The best Pubquiz"'],
			guildOnly: true,

			args: [
				{
					key: 'title',
					prompt: 'What title should this Pubquiz have? Respond with `default` for the default value (<name>\'s Pubquiz).',
					type: 'string'
				},
				{
					key: 'description',
					prompt: 'How do you want to describe this Pubquiz? Respond with `default` for the default value (none).',
					type: 'string'
				},
				{
                    key: 'imageUrl',
                    label: 'image url or upload',
                    prompt: 'Do you want to show an image in the Pubquiz details? If so, send the url or upload an image, else respond with `default` to leave empty.',
                    type: 'url',
                    wait: 60
				}
			]
		});
	}

	async run (message, { title, description, imageUrl }) {
		const creatorId = message.author.id
		const creatorName = message.author.username
		const channelId = message.channel.id
		const guildId = message.channel.guild.id

		const isCreator = await db.oneOrNone(`
                SELECT guild_id, controls_channel_id
                FROM pubquiz_sessions
                WHERE creator_id = $1;
            `, [creatorId])

		const isparticipant = await db.oneOrNone(`
                SELECT pubquiz_sessions.guild_id, pubquiz_sessions.feed_channel_id
                FROM pubquiz_participants
                INNER JOIN pubquiz_sessions
                ON pubquiz_participants.session_uuid = pubquiz_sessions.session_uuid
                WHERE participant_id = $1;
            `, [creatorId])

		if (isCreator) {
			message.reply(`You have **already created** a Pubquiz here: ${this.client.guilds.cache.get(isCreator.guild_id).channels.cache.get(isCreator.controls_channel_id)}. There can only be one created Pubquiz per user.`)
		} else if (isparticipant) {
			message.reply(`You are **already participating** in a Pubquiz here: ${this.client.guilds.cache.get(isparticipant.guild_id).channels.cache.get(isparticipant.feed_channel_id)}`)
		} else {
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

				await message.guild.channels.create(title !== 'default' ? title : `${creatorName}'s Pubquiz`, {
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
				}).then(createdChannel => {
					categoryChannel = createdChannel
					categoryChannel.setPosition(0)
				})

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

				// Send instrunctions for controls
				const commandGroups = await this.client.registry.groups.filter(group => group.id !== 'commands' && group.id !== 'util')

				await controlsChannel.send(`<@!${creatorId}>`)
				let messageString = 'Available commands (in this channel):'
				commandGroups.forEach(group => {
					messageString += `\n\n__${group.name}__`
					group.commands.forEach(command => {
						messageString +=
							''
							+ `\n__**${command.name}**:__ ${command.description.replace(/#feed/gm, feedChannel.toString()).replace(/#controls/gm, controlsChannel.toString())}`
							+ (command.argsCollector ? `\n**		Format:** ${command.usage(command.format)}` : '')
							+ (command.aliases && command.aliases.length > 0 ? `\n**		Aliases:** ${command.aliases.join('`, `')}` : '')
							+ (command.examples && command.examples.length > 0 ? `\n**		Examples:** *\`${command.examples.join('`, `')}\`*` : '')
					})
				})

				const helpMessage = await controlsChannel.send(messageString, { split: true })

				const helpMessageIds = []
				helpMessage.forEach(message => {
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
					[v4(), generatePassword(20), v4(), creatorId, guildId, categoryChannel.id, feedChannel.id, controlsChannel.id, helpMessageIds, title !== 'default' ? title : null, description !== 'default' ? description : null, creatorName, message.author.avatarURL({ dynamic: true, size: 32 }), imageUrl !== 'default' ? imageUrl : null]
				)

				message.reply("The Pubquiz was **created successfully**.")
				message.author.send({
					content: '**Your Pubquiz details:**',
					embed: newPubquiz(creatorName, pubquizData.creator_avatarurl, pubquizData.title, pubquizData.description, null, pubquizData.pubquiz_uuid, pubquizData.pubquiz_password, pubquizData.image_url)
				})
				// message.author.send(`**Your Pubquiz details:**
				// \`\`\`UUID: ${pubquizData.pubquiz_uuid}\nPassword: ${pubquizData.pubquiz_password}\`\`\`\nYou may share the UUID with others so that they can also use your Pubquiz. They will need to make a copy before they can edit the queue. \nUsing the password you can edit the Pubquiz either in Discord or onine (in the future).\nPubquizes without questions will be removed after 7 days.
				// `)
			} catch (e) {
				console.log(e)
				await categoryChannel.children.forEach(channel => channel.delete());
				setTimeout(() => {
					categoryChannel.delete();
				}, 200)
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
	}
};