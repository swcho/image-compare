// Minimal background service worker.
// Currently only listens for extension install to set default settings.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    domain: '',
    enabled: true,
  });
});

// Fetch images on behalf of popup pages to bypass CORS restrictions.
// Background service workers have host_permissions and are not subject to CORS.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'fetchImage') {
    fetch(message.url as string)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        const mimeType = res.headers.get('content-type') ?? 'image/png';
        sendResponse({ ok: true, data: Array.from(new Uint8Array(buffer)), mimeType });
      })
      .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});
