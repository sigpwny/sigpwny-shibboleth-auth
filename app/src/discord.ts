import path from 'path';

import { CommandoClient, SyncSQLiteProvider } from 'discord.js-commando';
import sqlite3 from 'better-sqlite3';
import { GuildMember, GuildChannel, Guild } from 'discord.js';

import config from './config';
import CommandGroup from './commandGroup';
import db from "./db";
import DescriptionCommand from "./commands/config/description";
import RoleMappingCommand from "./commands/config/roleMapping";
import LoggingChannelCommand from "./commands/config/loggingChannel";
import LinkCommand from "./commands/config/link";
import { DiscordServer } from '@prisma/client';

const commando = new CommandoClient({
    commandPrefix: 'shib!',
    owner: config.SUPERADMIN_USER_IDS,
    invite: 'https://discord.gg/cWcZ6a9',
});
// TODO - store commando settings (guild bot prefix, guild enabled commands, etc.) in same DB as bot settings?
commando.setProvider(new SyncSQLiteProvider(sqlite3("commando.db")))

commando.registry
    // Registers your custom command groups
    .registerGroups([
        [CommandGroup.CONFIG, 'Commands for server administrators to configure the bot & web interface settings']
    ])

    // Registers all built-in groups, commands, and argument types
    .registerDefaults()
    .registerCommands([
        DescriptionCommand,
        LoggingChannelCommand,
        RoleMappingCommand,
        LinkCommand
    ]);

commando.on("guildCreate", function(guild){
    console.log(`the client joined guild ${guild.id}`);
    const success = createServerIfNotExists(guild);
    if (success) {
        console.log("added guild to db");
    }
});

commando.on("ready", async function(){
    console.log(`I am ready! Logged in as ${commando.user?.tag}!`);
    console.log(`Bot has started - #${commando.guilds.cache.size} guilds`); 

    for (let guild of commando.guilds.cache.values()) {
        console.log(guild.name);
        const success = await createServerIfNotExists(guild);
        if (success) {
            console.log("added guild to db");
        }
    }
      //commando.user?.setActivity("testing1");
    const link = await commando.generateInvite(['SEND_MESSAGES', 'MANAGE_ROLES']);
    console.log(`Generated bot invite link: ${link}`);
});

commando.login(config.DISCORD_BOT_TOKEN);

async function createServerIfNotExists(guild: Guild): Promise<boolean> {
    const server = await db.discordServer.findOne({where: {id: guild.id}});
    if (!server) {
        await db.discordServer.create({data: {id: guild.id, name: guild.name}});
        return true;
    }
    return false;
}

function getGuildMember(guildId: string, userId: string): GuildMember | undefined {
    return commando.guilds.cache.get(guildId)?.members.cache.get(userId)
}

function logToChannel(server: DiscordServer, message: string) {
    console.log(`Server ${server.id} - ${message}`);
    if (server.loggingChannelId) {
        const channel = <any>commando.guilds.cache.get(server.id)?.channels.cache.get(server.loggingChannelId);
        if (channel)
            channel.send(message);
    }
}

export {
    getGuildMember,
    logToChannel,
    commando
}