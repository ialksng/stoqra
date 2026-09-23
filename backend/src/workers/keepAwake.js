/**
 * Keep-Awake Self-Ping Worker for Free Tier Hosting (Render / Cloudflare)
 * Automatically pings the service health endpoint every 12 minutes
 * to prevent the instance from idling out / sleeping after 15 minutes.
 */

let keepAwakeInterval = null;

export const startKeepAwake = () => {
  // Resolve ping target URL
  const pingUrl =
    process.env.KEEP_AWAKE_URL ||
    (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/health` : null) ||
    'https://ialksng.me/projects/stoqra/health';

  // Render spins down after 15 minutes of inactivity; ping every 12 minutes
  const INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

  console.log(`[KeepAwake] Initializing keep-awake service targeting: ${pingUrl} (every 12m)`);

  const executePing = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Stoqra-KeepAwake-Monitor/1.0' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        console.log(`[KeepAwake] Self-ping successful: ${pingUrl} (Status: ${res.status})`);
      } else {
        console.warn(`[KeepAwake] Self-ping returned non-200: ${res.status}`);
      }
    } catch (err) {
      console.warn(`[KeepAwake] Self-ping attempt note: ${err.message}`);
    }
  };

  // Run initial ping after 1 minute of startup, then schedule every 12 minutes
  setTimeout(executePing, 60 * 1000);
  keepAwakeInterval = setInterval(executePing, INTERVAL_MS);

  return keepAwakeInterval;
};

export const stopKeepAwake = () => {
  if (keepAwakeInterval) {
    clearInterval(keepAwakeInterval);
    keepAwakeInterval = null;
    console.log('[KeepAwake] Keep-awake worker stopped.');
  }
};

export default { startKeepAwake, stopKeepAwake };
