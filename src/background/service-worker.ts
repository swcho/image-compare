// Minimal background service worker.
// Currently only listens for extension install to set default settings.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    domain: '',
    enabled: true,
  });
});
