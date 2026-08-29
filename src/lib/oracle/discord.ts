/**
 * Discord error alerting for the oracle writer. Errors only — silent on success.
 * Configure with ORACLE_DISCORD_WEBHOOK_URL; unset = no-op.
 */

export async function notifyError(message: string): Promise<void> {
  const url = process.env.ORACLE_DISCORD_WEBHOOK_URL;
  if (!url) return;
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
