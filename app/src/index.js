const restify = require("restify");
const uuidv4 = require("uuid/v4");
const fetch = require("node-fetch");
const btoa = require("btoa");
const server = restify.createServer();
server.use(restify.plugins.queryParser());
const config = require("./config.js");
const { catchAsync } = require("./utils");
const Discord = require("discord.js");
const client = new Discord.Client();
client.login(config.DISCORD_BOT_TOKEN);

// TODO - save authorized users to a db?

let guild = null;
const SIGPWNY_GUILD_ID = "485104508175646751";
client.on("ready", () => {
    guild = client.guilds.get(SIGPWNY_GUILD_ID);
});


const redirect = encodeURI("https://shib.sigpwny.com/callback/discord");
//const redirect = encodeURI("http://127.0.0.1:8080/callback/discord");
var stateMap = {};

server.get("/login", (req, res, next) => {
    var state = uuidv4();
    stateMap[state] = req.header("eppn");
    res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${redirect}&state=${state}`, next);
});

server.get("/callback/discord", catchAsync(async (req, res, next) => {
    /*
    if (!req.query.code) throw new Error('NoCodeProvided');
    if (!req.query.state) throw new Error('NoStateProvided');
    if (!(req.query.state in stateMap)) throw new Error('InvalidStateProvided');
    */
    if (!req.query.code) {
        res.send(400, "No Code Provided");
        return next();
    }
    if (!req.query.state) {
        res.send(400, "No State Provided");
        return next();
    }
    if (!(req.query.state in stateMap)) {
        res.send(400, "Invalid State");
        return next();
    }
    const code = req.query.code;
    const creds = btoa(`${config.DISCORD_CLIENT_ID}:${config.DISCORD_CLIENT_SECRET}`);
    const tokenResponse = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`,
    {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
        },
    });
    const tokenJson = await tokenResponse.json();

    const userResponse = await fetch(`https://discordapp.com/api/users/@me`,
    {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenJson.access_token}`,
        },
    });
    const userJson = await userResponse.json();
    console.log(userJson);

    const user = client.users.get(userJson.id);
    const member = guild.member(user);
    const uiucRole = guild.roles.find(role => role.name === 'uiuc');
    // TODO - assign alum role based on shib headers
    //const alumRole = guild.roles.find(role => role.name === 'alum');
    member.addRole(uiucRole);
    res.send(200, "Success!")
}));

server.get("/", (req, res, next) => {
    var body = '<html><body><a href="./login">Login</a></body></html>';
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'text/html'
    });
    res.write(body);
    res.end();
    return next();
});

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});
