import {Command, CommandoClient, CommandoMessage} from "discord.js-commando"
import CommandGroup from "../../commandGroup";
import db from "../../db";

export default class DescriptionCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'description',
            group: CommandGroup.CONFIG,
            memberName: 'description',
            description: 'Set the server description info block on the web login page',
            guildOnly: true,
            argsType: 'single',
            args: [
                {
                    key: 'text',
                    prompt: 'What would you like to set the signup page description to?',
                    type: 'string'
                },
            ],
            userPermissions: [ 'ADMINISTRATOR' ]
        });
    }
    
    public async run(message: CommandoMessage, { text }: {text: string}) {
        console.log(`description: ${text}`);
        const discordServer = await db.discordServer.findOne({where: {id: message.guild.id}});
        if (discordServer) {
            await db.discordServer.update({
                where: {id: message.guild.id}, 
                data: {description: text}
            });
            return message.reply("Description updated!");
        }
        else return message.reply("Error - could not find server");
    }
};