import {Command, CommandoClient, CommandoMessage} from "discord.js-commando"
import CommandGroup from "../../commandGroup";
import config from "../../config";

export default class LinkCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'link',
            group: CommandGroup.CONFIG,
            memberName: 'link',
            description: 'Get the signup link',
            guildOnly: true,
            examples: [
                "shib!link"
            ]
        });
    }

    public async run(message: CommandoMessage) {
        return message.reply(`${config.APP_HOSTNAME}/signup/${message.guild.id}`);
    }
};