async function scale(bitmap: ImageBitmap, maxWidth: number, quality: number): Promise<Blob> {
  const ratio = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("encode");
  return blob;
}

async function decode(file: Blob, maxWidth: number): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { resizeWidth: maxWidth, resizeQuality: "medium" });
  } catch {
    return createImageBitmap(file);
  }
}

export async function variantsFromFile(file: File): Promise<{ thumb: Blob; full: Blob }> {
  const bitmap = await decode(file, 1280);
  try {
    const full = await scale(bitmap, 1280, 0.8);
    const thumb = await scale(bitmap, 420, 0.68);
    return { thumb, full };
  } finally {
    bitmap.close();
  }
}

/** Keep the frame, drop megapixels. Colour stays — the home screen desaturates it. */
export async function coverFromFile(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    return await scale(bitmap, 1600, 0.82);
  } finally {
    bitmap.close();
  }
}
