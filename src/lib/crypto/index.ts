/**
 * Hash a string using a given algorithm using WebCrypto API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 * @param algorithm {string} Algorithm to use.
 * @param data {string} Data to hash.
 * @param format {string} Output format. Supported values are "hex" and "base64". Defaults to "hex".
 * @returns {Promise<string>} Hashed data.
 */
export async function hash(algorithm: SupportedAlgorithm, data: string, format: SupportedOutputFormat = "hex"): Promise<string> {
  if (!algorithm || !data) {
    throw new Error("Missing required parameters.");
  }

  // Warn about SHA-1 usage.
  // https://security.googleblog.com/2017/02/announcing-first-sha1-collision.html
  if (algorithm === "SHA-1") {
    console.warn("SHA-1 is now considered vulnerable and should not be used for cryptographic applications.");
  }

  // Convert the data into an ArrayBuffer.
  const buffer = new TextEncoder().encode(data);

  const hash = await window.crypto.subtle.digest(algorithm, buffer);

  if (format === "hex") {
    // Older browsers don't support Uint8Array.prototype.toHex so we need to use a polyfill.
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return window.btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export type SupportedAlgorithm =
  | "SHA-1"
  | "SHA-256"
  | "SHA-384"
  | "SHA-512";

export type SupportedOutputFormat =
  | "hex"
  | "base64";
