import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/** Largeurs générées pour le web (px). */
export const PHOTO_WIDTHS = [400, 800, 1200, 1920];

const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;

function variantName(baseName, width) {
  return width === 800 ? baseName : `${baseName}-${width}`;
}

export async function readImageMeta(srcPath) {
  const { width = 0, height = 0 } = await sharp(srcPath).metadata();
  return { width, height };
}

/**
 * Génère des variantes JPEG + WebP pour chaque largeur cible.
 * Retourne les chemins publics (/…) et métadonnées pour srcset.
 */
export async function optimizePhoto(srcPath, outDir, baseName) {
  const meta = await readImageMeta(srcPath);
  const variants = [];

  for (const width of PHOTO_WIDTHS) {
    if (meta.width <= 0) continue;
    const targetWidth = Math.min(width, meta.width);
    const name = variantName(baseName, width);
    const jpegPath = path.join(outDir, `${name}.jpg`);
    const webpPath = path.join(outDir, `${name}.webp`);

    const pipeline = sharp(srcPath).resize({
      width: targetWidth,
      fit: 'inside',
      withoutEnlargement: true,
    });

    await pipeline.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpegPath);
    await pipeline.clone().webp({ quality: WEBP_QUALITY }).toFile(webpPath);

    const outMeta = await readImageMeta(jpegPath);
    variants.push({
      width: targetWidth,
      jpeg: `/${path.posix.join(path.relative('public', outDir), `${name}.jpg`)}`,
      webp: `/${path.posix.join(path.relative('public', outDir), `${name}.webp`)}`,
      displayWidth: outMeta.width,
      displayHeight: outMeta.height,
    });
  }

  const defaultVariant = variants.find((v) => v.width === 800) ?? variants[variants.length - 1];
  const largeVariant = variants.find((v) => v.width === 1200) ?? defaultVariant;
  const heroVariant = variants.find((v) => v.width === 1920) ?? largeVariant;
  const thumbVariant = variants.find((v) => v.width === 400) ?? defaultVariant;

  return {
    src: defaultVariant.jpeg,
    srcWebp: defaultVariant.webp,
    srcLarge: largeVariant.jpeg,
    srcLargeWebp: largeVariant.webp,
    srcHero: heroVariant.jpeg,
    srcHeroWebp: heroVariant.webp,
    srcThumb: thumbVariant.jpeg,
    srcThumbWebp: thumbVariant.webp,
    width: defaultVariant.displayWidth,
    height: defaultVariant.displayHeight,
    srcsetWebp: buildSrcset(variants, 'webp'),
    srcsetJpeg: buildSrcset(variants, 'jpeg'),
  };
}

function buildSrcset(variants, format) {
  return variants
    .map((v) => `${format === 'webp' ? v.webp : v.jpeg} ${v.displayWidth}w`)
    .join(', ');
}

/** Vide un dossier de sortie avant régénération. */
export function clearDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith('.')) continue;
    fs.rmSync(path.join(dir, file), { force: true });
  }
}
