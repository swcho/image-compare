// Fetches images via the background service worker to bypass page-level CORS.
// Pages (especially GitHub user-uploads) may block direct fetch from content scripts,
// so all image network access in the extension goes through this helper.

export async function fetchToBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'fetchImage', url }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response.ok) {
        reject(new Error(`Failed to fetch image: ${response.error}`));
        return;
      }
      resolve(
        new Blob([new Uint8Array(response.data as number[])], {
          type: response.mimeType as string,
        }),
      );
    });
  });
}
