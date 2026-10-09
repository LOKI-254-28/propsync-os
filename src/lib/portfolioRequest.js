let queue = Promise.resolve();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// Portfolio reads share one queue, including their cursor pages and cooldowns.
export default function portfolioRequest(read) {
  const result = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await read();
      } catch (error) {
        const limited = Number(error.status || error.response?.status) === 429 || /rate limit exceeded/i.test(error.data?.error || error.message || '');
        if (!limited || attempt >= 3) throw error;
        const headers = error.originalError?.response?.headers || error.response?.headers;
        const header = headers?.get?.('retry-after') ?? headers?.['retry-after'];
        const seconds = Number(header);
        const retryAt = header && !Number.isFinite(seconds) ? Date.parse(header) : NaN;
        const wait = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : 10000 * 2 ** attempt;
        await pause(Math.max(1000, wait));
      }
    }
  });
  queue = result.then(() => pause(500), () => pause(500));
  return result;
}