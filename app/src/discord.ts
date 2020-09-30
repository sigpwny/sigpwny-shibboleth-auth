import path from 'path';

import { CommandoClient, SyncSQLiteProvider } from 'discord.js-commando';
import sqlite3 from 'better-sqlite3';
import config from './config';
import CommandGroup from './commandGroup';

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

    // Registers all of your commands in the ./commands/ directory
    .registerCommandsIn(path.join(__dirname, 'commands'));



commando.on("guildCreate", function(guild){
    console.log(`the client joined guild ${guild.id}`);
});

commando.on("ready", function(){
	console.log(`I am ready! Logged in as ${commando.user?.tag}!`);
	console.log(`Bot has started - #${commando.guilds.cache.size} guilds`); 

  	commando.user?.setActivity("testing1");
	/*commando.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE'])
	.then(link => {
		console.log(`Generated bot invite link: ${link}`);
		inviteLink = link;
	});*/
});

commando.login(config.DISCORD_BOT_TOKEN);