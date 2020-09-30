import { Channel } from "discord.js";
import {Command, CommandoClient, CommandoMessage} from "discord.js-commando"
import CommandGroup from "../../commandGroup";
import db from "../../db";

export default class LoggingChannelCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'logging_channel',
            group: CommandGroup.CONFIG,
            memberName: 'logging_channel',
            description: 'Set the channel to log successful logins to',
            guildOnly: true,
            userPermissions: [ 'ADMINISTRATOR' ],
            examples: [
                "shib!logging_channel #admin-logs"
            ],
            args: [
                {
                    key: 'channel',
                    prompt: 'Private channel to log successful logins to? (e.g. #admin-logs)',
                    type: 'channel'
                },
            ],
        });
    }

    public async run(message: CommandoMessage, { channel }: { channel: Channel }) {
        console.log(`channel: ${channel.id}`);
        const discordServer = await db.discordServer.findOne({where: {id: message.guild.id}});
        if (discordServer) {
            await db.discordServer.update({
                where: {id: message.guild.id}, 
                data: {loggingChannelId: channel.id}
            });
            return message.reply("Logging channel updated!");
        }
        else return message.reply("Error - could not find server");
    }
};