/** Built-in placeholder when no profile photo is uploaded (by gender). */
const svgMale = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="gm" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#bfdbfe"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><rect width="128" height="128" rx="26" fill="#eff6ff"/><circle cx="64" cy="46" r="24" fill="url(#gm)"/><path d="M28 128c0-28 16-48 36-48s36 20 36 48" fill="url(#gm)"/></svg>`;

const svgFemale = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fbcfe8"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect width="128" height="128" rx="26" fill="#fdf2f8"/><circle cx="64" cy="46" r="24" fill="url(#gf)"/><path d="M28 128c0-28 16-48 36-48s36 20 36 48" fill="url(#gf)"/></svg>`;

export const DEFAULT_AVATAR_MALE = `data:image/svg+xml,${encodeURIComponent(svgMale)}`;
export const DEFAULT_AVATAR_FEMALE = `data:image/svg+xml,${encodeURIComponent(svgFemale)}`;

export function getPatientAvatarUrl(p: { profilePhotoDataUrl: string | null; gender: "M" | "F" }): string {
  const u = p.profilePhotoDataUrl?.trim();
  if (u) return u;
  return p.gender === "F" ? DEFAULT_AVATAR_FEMALE : DEFAULT_AVATAR_MALE;
}

export function newAttachmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type CompressOpts = { maxDimension: number; quality: number; mime?: "image/jpeg" | "image/png" };

function outputMime(file: File, forced?: CompressOpts["mime"]): "image/jpeg" | "image/png" {
  if (forced) return forced;
  if (file.type === "image/png") return "image/png";
  return "image/jpeg";
}

export async function fileToCompressedDataUrl(file: File, opts: CompressOpts): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = Math.max(bitmap.width, bitmap.height);
    const scale = maxSide > opts.maxDimension ? opts.maxDimension / maxSide : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const mime = outputMime(file, opts.mime);
    return mime === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", opts.quality);
  } finally {
    bitmap.close();
  }
}

/** Raw data URL without resize (fallback when createImageBitmap fails, e.g. some formats). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

/** Load a data URL into an image and re-encode (second chance when createImageBitmap fails). */
async function compressImageDataUrl(dataUrl: string, opts: CompressOpts): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode"));
    img.src = dataUrl;
  });
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error("size");
  const maxSide = Math.max(w0, h0);
  const scale = maxSide > opts.maxDimension ? opts.maxDimension / maxSide : 1;
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const mime = opts.mime ?? "image/jpeg";
  if (mime === "image/png") return canvas.toDataURL("image/png");
  return canvas.toDataURL("image/jpeg", opts.quality);
}

/** Try canvas compression; on failure read file then try <img> decode + canvas, then raw data URL. */
export async function fileToDisplayableDataUrl(file: File, opts: CompressOpts): Promise<string> {
  try {
    return await fileToCompressedDataUrl(file, opts);
  } catch {
    const raw = await readFileAsDataUrl(file);
    try {
      return await compressImageDataUrl(raw, opts);
    } catch {
      return raw;
    }
  }
}

const MAX_READ_MB = 12;

export function assertImageFileSize(file: File): string | null {
  const mb = file.size / (1024 * 1024);
  if (mb > MAX_READ_MB) return `File is too large (max ${MAX_READ_MB} MB).`;
  return null;
}
