/**
 * Downscale + re-encode an image in the browser before upload.
 *
 * Why: Vercel serverless rejects request bodies over ~4.5 MB, and without R2
 * configured the image is stored as base64 in the DB (×1.37 size). A phone
 * photo straight off the camera fails both. Compressing to ≤1600px JPEG
 * keeps uploads in the tens-to-hundreds of KB while staying sharp enough
 * for exam figures.
 *
 * GIFs pass through untouched (re-encoding would kill the animation).
 */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
// Files already smaller than this and within dimensions are left alone.
const SKIP_BELOW_BYTES = 300_000;

export async function compressImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Not decodable here — let the server reject it with a clear error.
    return file;
  }

  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // White backdrop so transparent PNGs don't turn black as JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    // Only use the re-encode if it actually helped
    if (blob && blob.size < file.size) return blob;
    return file;
  } finally {
    bitmap.close();
  }
}
