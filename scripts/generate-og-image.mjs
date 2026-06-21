import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public', 'og-image.svg');
const pngPath = join(root, 'public', 'og-image.png');

const svg = await readFile(svgPath);

await sharp(svg, { density: 144 })
  .resize(1200, 1200)
  .png({ compressionLevel: 9 })
  .toFile(pngPath);

console.log('✓ Image de partage og-image.png (1200×1200)');
