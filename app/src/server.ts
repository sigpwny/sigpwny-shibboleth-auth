import Koa from 'koa';
import Router from 'koa-joi-router';
import bodyParser from 'koa-bodyparser';
import ClientOAuth2 from 'client-oauth2';
import koaJwt from 'koa-jwt';
import jsonwebtoken from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import config from './config';
import { PrismaClient } from '@prisma/client'

const app = new Koa();
// middleware to parse form bodies
app.use(bodyParser());
const Joi = Router.Joi;
const router = Router();

// init db connection via prisma
const prisma = new PrismaClient()

const discordAuth = new ClientOAuth2({
    clientId: config.DISCORD_CLIENT_ID,
    clientSecret: config.DISCORD_CLIENT_SECRET,
    accessTokenUri: 'https://discordapp.com/api/oauth2/token',
    authorizationUri: 'https://discordapp.com/api/oauth2/authorize'
  });

router.use();

const jwtMiddleware = koaJwt({ 
    secret: config.JWT_SECRET as string,
    cookie: 'session',
    key: 'jwtdata'
});

const adminMiddleware = async (ctx: Koa.Context, next: Koa.Next) => {
    ctx.assert(ctx.state.jwtdata.admin, 401);
    await next();
};

router.get('/api/login/:id', {
    validate: {
        params: {
            'id': Joi.string()
        }
    }
}, async (ctx) => {
    ctx.body = ctx.request.params.id;
});


router.get('/admin/login', async (ctx) => {
    const state = uuidv4();
    const jwt = jsonwebtoken.sign({
        state: state
    }, config.JWT_SECRET as string);
    ctx.cookies.set('session', jwt, {secure: true, httpOnly: true});
    ctx.redirect(discordAuth.code.getUri({redirectUri: `${config.APP_HOSTNAME}/auth/discord/admin/callback`, state: state}));
});

router.use('/auth/discord/admin/callback', jwtMiddleware);
router.get('/auth/discord/admin/callback', async (ctx) => {
    const {state: oAuthState} = ctx.state.jwtdata;
    // assert that state is correct 
    ctx.assert(ctx.query.state === oAuthState, 400, 'Invalid OAuth state');
    // get auth token
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
    const userId = userJson.id as string; // the discord user id

    // check if their uid is in admin uids
    ctx.assert(config.ADMIN_USER_IDS?.includes(userId), 401, 'You are not an admin');
    const jwt = jsonwebtoken.sign({
        admin: true
    }, config.JWT_SECRET as string);
    ctx.cookies.set('session', jwt, {secure: true, httpOnly: true});

});


router.use('/admin/add_server', jwtMiddleware, adminMiddleware);
router.post('/admin/add_server', {

}, async (ctx) => {
    const {id} = ctx.request.toJSON();

    const result = await prisma.discordServer.create({
        data: {
            id: id
        }
    });
    ctx.body = result;
});



// ONLY the /login endpoint is protected by shib (shibboleth2.xml). We must get the headers from here and store them in user session.
router.get('/login', {
    validate: {
        header: {
            'unscoped-affiliation': Joi.string(),
            'uid': Joi.string()
        },
        query: {
            'server': Joi.string()
        }
    }
}, async (ctx) => {
    const state = uuidv4();
    const data = {
        affiliations: ctx.request.headers['unscoped-affiliation'].split(','),
        uid: ctx.request.headers['uid'],
        discordServer: ctx.request.query['server'],
        state: state
    };
    console.log(data);

    const server = await prisma.discordServer.findOne({where: {id: data.discordServer}});
    ctx.assert(server, 400, 'invalid discord server');

    const jwt = jsonwebtoken.sign(data, config.JWT_SECRET as string);
    ctx.cookies.set('session', jwt, {secure: true, httpOnly: true});
    ctx.redirect(discordAuth.code.getUri({redirectUri: `${config.APP_HOSTNAME}/auth/discord/callback`, state: state}));
});

router.use('/auth/discord/callback', jwtMiddleware);
router.get('/auth/discord/callback', {
    validate: {
        query: {
            'code': Joi.string(),
            'state': Joi.string()
        }
    }
}, async (ctx) => {
    const {discordServer, affiliations: shibAffiliations, uid: shibId, state: oAuthState} = ctx.state.jwtdata;
    // assert that state is correct 
    ctx.assert(ctx.query['state'] === oAuthState, 400, 'Invalid OAuth state');
    
    // get auth token
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
    const userId = userJson.id; // the discord user id

    const user = await prisma.user.create({
        data: {
            shibId: shibId,
            discordId: userId,
            shibAffiliations: shibAffiliations
        }
    });

    ctx.body = user;
});
router.get('/', async (ctx) => {
    ctx.body = 'shibboleth discord auth';
});
app.use(router.middleware());

app.listen(8080);

console.log('Server running on port 8080');