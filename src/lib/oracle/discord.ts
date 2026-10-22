/**
 * Discord error alerting for the oracle writer. Errors only — silent on success.
 * Configure with ORACLE_DISCORD_WEBHOOK_URL; unset = no-op.
 */

const ALERT_DEDUPE_MS = 30 * 60_000;
const recentAlerts = new Map<string, number>();

export async function notifyError(message: string): Promise<void> {
  const url = process.env.ORACLE_DISCORD_WEBHOOK_URL;
  if (!url) return;
  // Same-signature alerts within 30 min are suppressed (cold starts reset this).
  const key = message.slice(0, 140);
  const now = Date.now();
  const lastSentAt = recentAlerts.get(key);
  if (lastSentAt && now - lastSentAt < ALERT_DEDUPE_MS) return;
  recentAlerts.set(key, now);
  if (recentAlerts.size > 100) {
    for (const [k, t] of recentAlerts) {
      if (now - t >= ALERT_DEDUPE_MS) recentAlerts.delete(k);
    }
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **Oracle writer error**\n\`\`\`\n${message.slice(0, 1800)}\n\`\`\``,
      }),
    });
  } catch (e) {
    console.error("Failed to send Discord alert:", e);
  }
}
