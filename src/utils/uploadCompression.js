const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.78;
const DEFAULT_MAX_IMAGE_MB = 1.5;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("Could not read image"));
  };
  img.src = url;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Compress failed"));
  }, type, quality);
});

export const fmtFileSize = (bytes) => (
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`
);

export async function compressUploadImage(file, options = {}) {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    maxImageMb = DEFAULT_MAX_IMAGE_MB,
  } = options;

  if (!file?.type?.startsWith("image/")) return file;
  if (file.size <= maxImageMb * 1024 * 1024) return file;

  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas failed");
  ctx.drawImage(img, 0, 0, width, height);

  const outType = file.type === "image/png"
    ? "image/jpeg"
    : file.type === "image/webp"
      ? "image/webp"
      : "image/jpeg";
  const blob = await canvasToBlob(canvas, outType, quality);

  if (blob.size >= file.size) return file;

  const ext = outType === "image/webp" ? "webp" : "jpg";
  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "")}.${ext}`,
    { type: outType, lastModified: Date.now() }
  );
}
