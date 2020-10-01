import { Readable } from "stream"
import { MessageAttachment } from "discord.js";
import {Command, CommandoClient, CommandoMessage} from "discord.js-commando"
import CommandGroup from "../../commandGroup";
import db from "../../db";

export default class DescriptionCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'csv',
            group: CommandGroup.CONFIG,
            memberName: 'csv',
            description: 'Export signups as a CSV file',
            guildOnly: true,
            userPermissions: [ 'ADMINISTRATOR' ]
        });
    }
    
    public async run(message: CommandoMessage, { text }: {text: string}) {
        const signups = await db.user.findMany({
            where: {
                discordServerId: message.guild.id
            }
        });
        let csvString = "";
        for (let signup of signups) {
            csvString += `${signup.discordId},${signup.shibId},${signup.shibAffiliations}\n`;
        }
        const now = new Date();
        return message.reply("CSV generated", new MessageAttachment(Readable.from([csvString]), `signups-${now.getDay()}-${now.getMonth()}-${now.getFullYear()}.csv`));
    }
};