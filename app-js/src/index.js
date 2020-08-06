const restify = require("restify");
const Keyv = require('keyv');
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

const keyv = new Keyv(undefined, { ttl: 600*1000 });
// Handle DB connection errors
keyv.on('error', err => console.log('Connection Error', err));

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

server.get("/login", (req, res, next) => {
    const session = uuidv4();
    const state = uuidv4();
    keyv.set(session, {
        affiliation: req.header("unscoped-affiliation"),
        netid: req.header("uid"),
        state: state
    });
    console.log(keyv.get(session));

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
    if (!req.cookies["session"]) {
        res.send(400, "No session cookie found. Do you have cookies disabled?");
        return next();
    }
    const shibInfo = keyv.get(req.cookies["session"]);
    if (!shibInfo) {
        res.send(400, "Not authenticated with Shibboleth, or authentication expired. Try again.");
        return next();
    }
    if (!req.query.code) {
        res.send(400, "No code provided. Please report this error.");
        return next();
    }
    if (!req.query.state) {
        res.send(400, "No state provided. Please report this error.");
        return next();
    }
    if (shibInfo.state !== req.query.state) {
        res.send(400, "Invalid state provided. Please report this error.");
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
    member.addRole(uiucRole);
    // assign alum role if they are an alum
    if (shibInfo.affiliation && shibInfo.affiliation.includes('alum')) {
        const alumRole = guild.roles.find(role => role.name === 'alum');
        member.addRole(alumRole);
    }
    const message = `<@${user.id}>,${shibInfo.netid},${shibInfo.affiliation}`;
    logChannel.send(message);
    fs.appendFileSync("discord.csv", `${message}\n`);
    res.send(200, "Success!")
}));

server.get("/", (req, res, next) => {
    const body = `
    <html>
    <body>
    <p>Authenticate and Sign up for the SIGPwny discord</p>
    <p>Information collected: NetID, Discord ID, University Affiliation</p>
    <p>SIGPwny cares a lot about being inclusive. By signing in, you agree to our rules/code of conduct.</p>
    <ul>
    <li>Be nice</li>
    <li>Don&apos;t do anything illegal.</li>
    <li>No racism/sexism/homophobia etc.</li>
    <li>No NSFW.</li>
    </ul>
    <h1><a href="./login">Ok</a></h1>
    <p><small>note: if you were not already signed into discord web, you might have to try again</small></p>
    <p><small><a href="https://github.com/arxenix/uiuc-shibboleth-auth">Open Source</a></small></p>
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
