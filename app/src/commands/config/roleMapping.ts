import { Role } from "discord.js";
import {Command, CommandoClient, CommandoMessage} from "discord.js-commando"
import CommandGroup from "../../commandGroup";
import db from "../../db";

export default class RoleMappingCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'role_mapping',
            group: CommandGroup.CONFIG,
            memberName: 'role_mapping',
            description: 'Sets up a mapping from shibboleth affiliation -> discord role',
            guildOnly: true,
            userPermissions: [ 'ADMINISTRATOR' ],
            examples: [
                "shib!role_mapping student @UIUC-Role",
                "shib!role_mapping alum @Alumni-Role"
            ],
            args: [
                {
                    key: 'affiliation',
                    prompt: 'Shibboleth affiliation to map? (e.g. student, alum)',
                    type: 'string',
                },
                {
                    key: 'role',
                    prompt: 'Discord role to map to? (e.g. @UIUC-Role)',
                    type: 'role',
                },
            ],
        });
    }

    public async run(message: CommandoMessage, { affiliation, role }: { affiliation: string, role: Role }) {
        console.log(`affiliation: ${affiliation}, role: ${role.id}, ${role.name}`);
        const discordServer = await db.discordServer.findOne({where: {id: message.guild.id}});
        if (discordServer) {
            // update or create (upsert) the mapping
            await db.discordServer.update({
                where: {id: message.guild.id}, 
                data: {
                    roleMappings: {
                        upsert: [
                            {
                                create: {shibAffiliation: affiliation, discordRole: role.id},
                                update: {discordRole: role.id},
                                where: {
                                    shibAffiliation_discordServerId: {
                                        shibAffiliation: affiliation,
                                        discordServerId: message.guild.id
                                    }
                                },
                            }
                        ]
                    }
                }
            });
            return message.reply(`Affiliation mapping updated: ${affiliation} -> ${role.id}`);
        }
        else return message.reply("Error - could not find server");
    }
};