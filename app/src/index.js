const restify = require("restify");
const CookieParser = require('restify-cookies');
const uuidv4 = require("uuid/v4");
const fetch = require("node-fetch");
const btoa = require("btoa");
const fs = require("fs");
const server = restify.createServer();
server.use(restify.plugins.queryParser());
server.use(CookieParser.parse);
const config = require("./config.js");
const { catchAsync } = require("./utils");
const Discord = require("discord.js");
const client = new Discord.Client();
client.login(config.DISCORD_BOT_TOKEN);

// TODO - save authorized users to a db?

let guild = null;
let logChannel = null;
const LOGGING_CHANNEL_ID = "537700054677323779";
const SIGPWNY_GUILD_ID   = "485104508175646751";
client.on("ready", () => {
    guild = client.guilds.get(SIGPWNY_GUILD_ID);
    logChannel = guild.channels.get(LOGGING_CHANNEL_ID);
});


const redirect = encodeURI("https://shib.sigpwny.com/callback/discord");
//const redirect = encodeURI("http://127.0.0.1:8080/callback/discord");
const shibMap = {};
const states = new Set();

server.get("/login", (req, res, next) => {
    const session = uuidv4();
    const state = uuidv4();
    states.add(state);
    shibMap[session] = {
        eppn: req.header("eppn"),
        eduPersonAffiliation: req.header("eduPersonAffiliation"),
        uid: req.header("uid")
    }
    console.log(shibMap[cookie]);

    res.setCookie("session", session, {
        path: "/",
        domain: "shib.sigpwny.com",
        maxAge: 600,
        secure: true,
        httpOnly: true
    });

    res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${redirect}&state=${state}`, next);
});

server.get("/callback/discord", catchAsync(async (req, res, next) => {
    /*
    if (!req.query.code) throw new Error('NoCodeProvided');
    if (!req.query.state) throw new Error('NoStateProvided');
    if (!(req.query.state in stateMap)) throw new Error('InvalidStateProvided');
    */
    if (!req.cookies["session"] || !shibMap.hasOwnProperty(req.cookies["session"])) {
        res.send(400, "Not Authenticated With Shibboleth");
        return next();
    }
    if (!req.query.code) {
        res.send(400, "No Code Provided");
        return next();
    }
    if (!req.query.state) {
        res.send(400, "No State Provided");
        return next();
    }
    if (!states.has(req.query.state)) {
        res.send(400, "Invalid State");
        return next();
    }
    const shibInfo = shibMap[req.cookies["session"]];
    states.delete(state);
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
    const message = `<@${user.id}>,${shibInfo.eppn},${shibInfo.eduPersonAffiliation}`;
    logChannel.send(message);
    fs.appendFileSync("/var/log/discord.log", `${message}\n`);
    res.send(200, "Success!")
}));

server.get("/", (req, res, next) => {
    const body = `
    <html>
    <body>
    <p>Sign up for SigPwny</p>
    <p>By signing up, you agree to our code of conduct.</p>
    <ul>
    <li>be nice</li>
    <li>no racism/sexism/homophobia etc.</li>
    <li>no nsfw</li>
    </ul>
    <a href="./login">Go!</a>
    </body>
    </html>
    `;
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
