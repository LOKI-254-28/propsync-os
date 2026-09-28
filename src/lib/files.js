import { base44 } from "@/api/base44Client";

// Open a file for viewing/download. Public URLs (http/https) open directly;
// private file_uri values are converted to a short-lived signed URL first.
export async function downloadFile(fileUriOrUrl) {
  if (!fileUriOrUrl) return;
  if (/^https?:\/\//i.test(fileUriOrUrl)) {
    window.open(fileUriOrUrl, "_blank");
    return;
  }
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUriOrUrl });
  window.open(signed_url, "_blank");
}