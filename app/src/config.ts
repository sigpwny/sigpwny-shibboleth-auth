export default {
    DISCORD_CLIENT_ID: "" || process.env.DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET: "" || process.env.DISCORD_CLIENT_SECRET,
    DISCORD_BOT_TOKEN: "" || process.env.DISCORD_BOT_TOKEN,
    APP_HOSTNAME: "" || process.env.APP_HOSTNAME,
    JWT_SECRET: "" || process.env.JWT_SECRET,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS?.replace(" ", "").split(",")
}