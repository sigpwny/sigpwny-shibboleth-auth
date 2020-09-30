import {Command, CommandoClient, CommandoMessage} from "discord.js-commando"
import CommandGroup from "../../commandGroup";
import db from "../../db";

class DescriptionCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: 'description',
			group: CommandGroup.CONFIG,
			memberName: 'description',
			description: 'Set the server description info block on the web login page',
			args: [
				{
					key: 'text',
					prompt: 'What would you like to set the signup page description to?',
					type: 'string',
					infinite: true
				},
			],
		});
	}

	public async run(message: CommandoMessage, { text }: { text: string }) {
		console.log(text);
		if (!text) {
			// print current description
			const discordServer = await db.discordServer.findOne({where: {id: message.guild.id}});
			return message.reply(discordServer?.description ?? "Error - could not find server");
		}
		else {
			await db.discordServer.update({
				where: {id: message.guild.id},
				data: {description: text}
			});
			return message.reply("Description updated!");
		}
	}
};