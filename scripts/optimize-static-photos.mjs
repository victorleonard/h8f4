import fs from 'fs';
import path from 'path';
import { optimizePhoto } from './lib/optimize-image.mjs';

const IMAGES_DIR = 'public/images';
const BAND_SOURCE = path.join(IMAGES_DIR, 'band-photo.jpg');
const BAND_BACKUP = path.join(IMAGES_DIR, 'band-photo.source.jpg');

async function main() {
  if (!fs.existsSync(BAND_SOURCE)) {
    console.warn('⚠ band-photo.jpg introuvable — optimisation ignorée');
    return;
  }

  if (!fs.existsSync(BAND_BACKUP)) {
    fs.copyFileSync(BAND_SOURCE, BAND_BACKUP);
  }

  const optimized = await optimizePhoto(BAND_BACKUP, IMAGES_DIR, 'band-photo');

  const tsContent = `// Généré par scripts/optimize-static-photos.mjs — ne pas éditer à la main
export const bandPhoto = ${JSON.stringify(
    {
      alt: 'The Hateful Four (H8F4) en live',
      ...optimized,
    },
    null,
    2,
  )} as const;
`;

  fs.writeFileSync('src/data/band-photo.ts', tsContent);
  console.log('✓ band-photo optimisée (variantes 400–1920 px, WebP + JPEG)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
