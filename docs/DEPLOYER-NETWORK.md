# Deployer shared network

Deployer attaches services to `deployer_platform`. DNS uses **Compose service names**.

This app keeps the service name **`web`** (required by many Deployer app configs that inject env into `web`).

**BotL** (`Driffle/BotL-Legal-Email-Management`) uses **`botl-web`** so its nginx does not proxy to this app. Do not rename `web` here without updating Deployer **env service names** for this app.
