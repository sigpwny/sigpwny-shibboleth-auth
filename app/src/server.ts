import path from 'path';
import Koa from 'koa';
import Router from 'koa-joi-router';
import bodyParser from 'koa-bodyparser';
import ClientOAuth2 from 'client-oauth2';
import koaJwt from 'koa-jwt';
import jsonwebtoken from 'jsonwebtoken';
import render from 'koa-ejs'
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

import config from './config';
import { getGuildMember, commando, logToChannel } from './discord';
import db from './db';
import { markdownToSafeHtml } from './markdown';

const app = new Koa();
// ejs templating
render(app, {
    root: path.join(__dirname, 'views'),
    layout: 'template',
    viewExt: 'ejs',
    cache: false,
    debug: false
});

// middleware to parse form bodies
app.use(bodyParser());
const Joi = Router.Joi;
const router = Router();

const discordAuth = new ClientOAuth2({
    clientId: config.DISCORD_CLIENT_ID,
    clientSecret: config.DISCORD_CLIENT_SECRET,
    accessTokenUri: 'https://discordapp.com/api/oauth2/token',
    authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
    redirectUri: `${config.APP_HOSTNAME}/auth/discord/callback`
  });

const jwtMiddleware = koaJwt({ 
    secret: config.JWT_SECRET as string,
    cookie: 'session',
    key: 'jwtdata'
});

app.use( async (ctx, next) => {
    try {
      await next()
    } catch(err) {
      console.log(err.status);
      console.error(err.message);
      ctx.status = err.status || 500;
      // unsafe cast because of unsafe types somewhere...
      await (<any> ctx).render('error', {err: err, env: app.env});
    }
});

// ONLY the /login endpoint is protected by shib (shibboleth2.xml). We must get the headers from here and store them in user session.
router.get('/login', {
    validate: {
        header: Joi.object({
            'unscoped-affiliation': Joi.string().required(),
            'uid': Joi.string().required(),
        }).options({allowUnknown: true}),
        query: Joi.object({
            'server': Joi.string().required()
        }).options({allowUnknown: true}),
    }
}, async (ctx) => {
    const state = uuidv4();
    const data = {
        affiliations: ctx.request.headers['unscoped-affiliation'].split(';'),
        uid: ctx.request.headers['uid'],
        discordServer: ctx.request.query['server'],
        state: state
    };
    console.log(data);

    const server = await db.discordServer.findOne({where: {id: data.discordServer}});
    ctx.assert(server, 400, 'invalid discord server');

    const jwt = jsonwebtoken.sign(data, config.JWT_SECRET as string);
    ctx.cookies.set('session', jwt, {httpOnly: true});
    ctx.redirect(discordAuth.code.getUri({scopes: ["identify"], state: state}));
});

router.use('/auth/discord/callback', jwtMiddleware);
router.get('/auth/discord/callback', {
    validate: {
        query: Joi.object({
            'code': Joi.string().required(),
            'state': Joi.string().required(),
        }).options({allowUnknown: true}),
    }
}, async (ctx) => {
    const {discordServer: discordServerId, affiliations: shibAffiliations, uid: shibId, state: oAuthState} = ctx.state.jwtdata;
    // assert that state is correct 
    ctx.assert(ctx.query['state'] === oAuthState, 400, 'Invalid OAuth state');
    
    // get auth token (takes original urlstring, so it gets the code query param)
    const userToken = await discordAuth.code.getToken(ctx.url);
    const userResponse = await fetch(`https://discordapp.com/api/users/@me`,
    {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userToken.accessToken}`,
        },
    });
    const userJson = await userResponse.json();
    console.log(userJson);
    const userId = userJson.id;

    // check they are actually in the discord server
    const guildMember = getGuildMember(discordServerId, userId);
    if ( guildMember ) {
        const discordServer = await db.discordServer.findOne({where: {id: discordServerId}});
        if (discordServer) {
            // create or update user
            await db.discordServer.update({
                where: {id: discordServerId},
                data: {
                    users: {
                        create: {
                            shibId: shibId, 
                            discordId: userId, 
                            shibAffiliations: shibAffiliations.join(";")
                        }
                    }
                }
            });
            console.log("user registered");

            // get all mappings
            const affiliationToRoleMappings = await db.affiliationToRoleMapping.findMany({
                where: {discordServerId: discordServerId}
            });

            // find appropriate roles
            for (let affiliationToRoleMapping of affiliationToRoleMappings) {
                // if his affiliations contains this mapping
                if (shibAffiliations.includes(affiliationToRoleMapping.shibAffiliation)) {
                    const role = commando.guilds.cache.get(discordServerId)?.roles.cache.get(affiliationToRoleMapping.discordRole);

                    if (role) {
                        guildMember.roles.add(role);
                    }
                    else {
                        logToChannel(discordServer, `WARNING: could not find role ${affiliationToRoleMapping.discordRole} for affiliation ${affiliationToRoleMapping.shibAffiliation}`);
                    }
                }
            }
            logToChannel(discordServer, `<@${userId}>, ${shibId}, ${shibAffiliations.join(";")}`);
        }
        else {
            throw new Error(`could not retrieve discord server - ${discordServerId}`);
        }
    }
    else throw new Error(`User ${userId} not in server ${discordServerId}`);
    await ctx.render('success');
});
router.get('/', async (ctx) => {
    await ctx.render('index', {
        guildCount: commando.guilds.cache.size, 
        memberCount: commando.users.cache.size
    });
});

router.get('/signup/:id', {
    validate: {
        params: {
            'id': Joi.string().required(),
        }
    }
}, async (ctx) => {
    const server = await db.discordServer.findOne({where: {id: ctx.params.id}});
    ctx.assert(server, 400, 'invalid discord server');
    console.log(server);
    let description = server!.description.trim();
    if (description.startsWith("```") && description.endsWith("```")) {
        description = description.substring(3, description.length-3);
    }
    else if (description.startsWith("`") && description.endsWith("`")) {
        description = description.substring(1, description.length-1);
    }
    const sanitizedHtmlDescription = await markdownToSafeHtml(description);
    await ctx.render('signup', {server, title: commando.guilds.cache.get(server!.id)?.name ?? 'ERROR', sanitizedHtmlDescription});
});

app.use(router.middleware());

app.listen(8080);

console.log('Server running on port 8080');