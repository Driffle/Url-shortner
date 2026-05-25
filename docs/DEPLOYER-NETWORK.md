# Deployer shared network

Deployer attaches services to `deployer_platform`. DNS uses **Compose service names**.

Do not use a generic service name like `web` — it collides with other apps (e.g. BotL). This stack uses **`links-web`**.

BotL nginx must target **`botl-web:3000`**, not `web:3000`.
