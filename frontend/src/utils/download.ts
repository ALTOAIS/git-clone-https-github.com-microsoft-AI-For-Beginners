import { apiClient } from '../api/client';

/** Fetches a URL through the authenticated API client and triggers a browser download (blob URL). */
export async function downloadViaApi(path: string, filename: string) {
  const response = await apiClient.get(path, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
