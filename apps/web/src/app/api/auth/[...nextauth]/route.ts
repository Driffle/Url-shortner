import { handlers } from "@/auth";
import { withOAuthHostSync } from "@/server/auth-oauth-host";

export const GET = withOAuthHostSync(handlers.GET);
export const POST = withOAuthHostSync(handlers.POST);
