/**
 * Slack notification architecture (internal):
 * - Set SLACK_WEBHOOK_URL in production.
 * - Call `postSlack` from cron workers (daily digest, weekly report) or after major events.
 * - Keep payloads small; never send raw PII — aggregate metrics only.
 */

export async function postSlack(payload: { text: string; blocks?: unknown[] }): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postDailyDigestExample(topCampaign: string, clicks: number): Promise<boolean> {
  return postSlack({
    text: `Driffle Links — daily digest: ${clicks} clicks (top campaign: ${topCampaign})`,
  });
}
