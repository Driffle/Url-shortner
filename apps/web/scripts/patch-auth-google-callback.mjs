/**
 * Auth.js always sets OAuth callbackUrl to `{basePath}/callback/{providerId}`.
 * Driffle uses `/api/auth/google/callback` — patch @auth/core once after install.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "../node_modules/@auth/core/lib/utils/providers.js");

const marker = "GOOGLE_OAUTH_CALLBACK_URL";
const needle = "callbackUrl: `${url}/callback/${id}`,";
const replacement = `callbackUrl: id === "google" && process.env.GOOGLE_OAUTH_CALLBACK_URL
            ? process.env.GOOGLE_OAUTH_CALLBACK_URL
            : \`\${url}/callback/\${id}\`,`;

if (!fs.existsSync(target)) {
  console.warn("[patch-auth-google-callback] @auth/core not installed yet; skipping");
  process.exit(0);
}

let content = fs.readFileSync(target, "utf8");
if (content.includes(marker)) {
  process.exit(0);
}
if (!content.includes(needle)) {
  console.warn("[patch-auth-google-callback] providers.js layout changed; patch not applied");
  process.exit(0);
}

content = content.replace(needle, replacement);
fs.writeFileSync(target, content);
console.log("[patch-auth-google-callback] applied Google callback URL override");
