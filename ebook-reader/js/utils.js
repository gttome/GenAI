// js/utils.js

/**
 * Compute a unique document ID for a PDF source.
 * 
 * @param {File|Blob|string} pdfSource
 *   - File or Blob: hash first 1 MB, fallback to metadata.
 *   - string: URL to canonicalize.
 * @returns {Promise<string>} A hex string (for File/Blob) or normalized URL.
 */
export async function computeDocumentId(pdfSource) {
  // Case 1: File or Blob → hash first 1 MB
  if (pdfSource instanceof File || pdfSource instanceof Blob) {
    const chunkSize = 1024 * 1024; // 1 MB
    const blob = pdfSource.slice(0, chunkSize);
    try {
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (err) {
      console.warn(
        "computeDocumentId: hashing failed, falling back to metadata",
        err
      );
      if (
        pdfSource.name &&
        pdfSource.size != null &&
        pdfSource.lastModified != null
      ) {
        return `${pdfSource.name}-${pdfSource.size}-${pdfSource.lastModified}`;
      }
      throw new Error("computeDocumentId: unable to derive ID from Blob/File");
    }
  }

  // Case 2: URL string → canonicalize
  if (typeof pdfSource === "string") {
    try {
      const normalized = new URL(pdfSource, window.location.href).toString();
      return normalized;
    } catch {
      console.warn("computeDocumentId: invalid URL, returning raw string");
      return pdfSource;
    }
  }

  // Unsupported type
  return Promise.reject(
    new Error("computeDocumentId: unsupported pdfSource type")
  );
}
