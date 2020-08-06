import Koa from 'koa';
import Router from 'koa-joi-router';
import bodyParser from 'koa-bodyparser';
import ClientOAuth2 from 'client-oauth2';
import Keyv from 'keyv';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';

import config from './config';
import { PrismaClient } from '@prisma/client'


const app = new Koa();
// middleware to parse form bodies
app.use(bodyParser());
const Joi = Router.Joi;
const router = Router();

const SESSION_TTL_SECONDS = 600
// sesion store uses Keyv backed by redis
const sessionStore = new Keyv('redis://cache:6379', { ttl: SESSION_TTL_SECONDS*1000 });
// init db connection via prisma
const prisma = new PrismaClient()

sessionStore.on('error', err => console.log('Connection Error', err));

const discordAuth = new ClientOAuth2({
    clientId: config.DISCORD_CLIENT_ID,
    clientSecret: config.DISCORD_CLIENT_SECRET,
    accessTokenUri: 'https://discordapp.com/api/oauth2/token',
    authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
    redirectUri: `${config.APP_HOSTNAME}/auth/discord/callback`
  });

router.get('/api/login/:id', {
    validate: {
        params: {
            id: Joi.string()
        }
    }
}, async (ctx) => {
    ctx.body = ctx.request.params.id;
});

router.get('/auth/discord', async (ctx) => {

    ctx.redirect(discordAuth.code.getUri());
});

router.get('/auth/discord/callback', {
    validate: {
        query: {
            code: Joi.string(),
            state: Joi.string()
        }
    }
}, async (ctx) => {
    const stateUid = uuidv4();
    const userToken = await discordAuth.code.getToken(ctx.url, {state: stateUid});
    ctx.body = "todo"
});
router.get('/', async (ctx) => {
    ctx.body = 'shibboleth discord auth';
});
app.use(router.middleware());

app.listen(8080);

console.log('Server running on port 8080');