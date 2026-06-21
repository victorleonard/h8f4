import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { clearDir, optimizePhoto } from './lib/optimize-image.mjs';
import { findFfmpeg, getVideoOrientation, optimizeVideo } from './lib/optimize-video.mjs';

const SRC = 'assets/live-assets';
const PHOTOS_OUT = 'public/live/photos';
const VIDEOS_OUT = 'public/live/videos';
const POSTERS_OUT = 'public/live/posters';

fs.mkdirSync(VIDEOS_OUT, { recursive: true });
fs.mkdirSync(POSTERS_OUT, { recursive: true });
clearDir(PHOTOS_OUT);

const slug = (name) =>
  name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();

function extractDateKey(file) {
  const match = file.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : null;
}

function findPosterForVideo(videoFile, photoList) {
  if (photoList.length === 0) return null;

  const videoDate = extractDateKey(videoFile);
  if (!videoDate) return photoList[0].src;

  const sameDay = photoList.filter((p) => p.file.includes(videoDate));
  if (sameDay.length > 0) return sameDay[Math.floor(sameDay.length / 2)].src;

  const videoTs = new Date(videoDate).getTime();
  let best = photoList[0].src;
  let bestDiff = Infinity;

  for (const photo of photoList) {
    const photoDate = extractDateKey(photo.file);
    if (!photoDate) continue;
    const diff = Math.abs(new Date(photoDate).getTime() - videoTs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = photo.src;
    }
  }

  return best;
}

function convertToJpeg(srcPath, outPath) {
  if (process.platform !== 'darwin') return false;

  try {
    execSync(`sips -s format jpeg "${srcPath}" --out "${outPath}"`, { stdio: 'ignore' });
    return fs.existsSync(outPath);
  } catch {
    return false;
  }
}

function generatePosterWithFfmpeg(videoPath, outPath) {
  try {
    execSync(
      `ffmpeg -y -ss 00:00:01 -i "${videoPath}" -vframes 1 -q:v 3 -vf "scale=640:-2" "${outPath}"`,
      { stdio: 'ignore' },
    );
    return fs.existsSync(outPath);
  } catch {
    return false;
  }
}

/** Extrait une frame réelle de la vidéo via Quick Look (macOS). */
function generatePosterWithQuickLook(videoPath, outPath) {
  if (process.platform !== 'darwin') return false;

  const tmpDir = fs.mkdtempSync(path.join(POSTERS_OUT, '.tmp-'));

  try {
    execSync(`qlmanage -t -s 640 -o "${tmpDir}" "${videoPath}"`, { stdio: 'ignore' });
    const png = fs.readdirSync(tmpDir).find((f) => f.endsWith('.png'));
    if (!png) return false;

    const ok = convertToJpeg(path.join(tmpDir, png), outPath);
    return ok;
  } catch {
    return false;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function generateVideoPoster(videoPath, outPath) {
  if (fs.existsSync(outPath)) return 'frame';
  if (generatePosterWithFfmpeg(videoPath, outPath)) return 'frame';
  if (generatePosterWithQuickLook(videoPath, outPath)) return 'frame';
  return null;
}

function resolveVideoPoster(videoPath, posterOutName, posterOutPath, videoFile, photoList) {
  const kind = generateVideoPoster(videoPath, posterOutPath);
  if (kind === 'frame') return { poster: `/live/posters/${posterOutName}`, kind: 'frame' };
  return { poster: findPosterForVideo(videoFile, photoList), kind: 'photo' };
}

function pruneOrphanVideos(activeOutNames) {
  if (!fs.existsSync(VIDEOS_OUT)) return;

  for (const file of fs.readdirSync(VIDEOS_OUT)) {
    const isVideo = file.endsWith('.mp4');
    const isStamp = file.endsWith('.mp4.stamp');
    if (!isVideo && !isStamp) continue;
    const videoName = isStamp ? file.replace(/\.stamp$/, '') : file;
    if (activeOutNames.has(videoName)) continue;
    fs.rmSync(path.join(VIDEOS_OUT, file), { force: true });
  }
}

async function main() {
  const files = fs.readdirSync(SRC).filter((f) => !f.startsWith('.'));

  const photos = [];
  const videos = [];
  const videoOutNames = new Set();
  let posterFromFrame = 0;
  let posterFromPhoto = 0;
  let videosEncoded = 0;
  let videosSkipped = 0;
  let videosCopied = 0;
  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  const ffmpeg = findFfmpeg();

  for (const file of files.sort()) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const outName = `${slug(base)}${ext}`;
    const srcPath = path.join(SRC, file);

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const baseName = slug(base);
      const optimized = await optimizePhoto(srcPath, PHOTOS_OUT, baseName);
      const dateMatch = file.match(/(\d{4})-(\d{2})-(\d{2})/);
      photos.push({
        file,
        year: dateMatch ? dateMatch[1] : 'live',
        ...optimized,
      });
    }

    if (['.mp4', '.webm', '.mov'].includes(ext)) {
      const videoOutName = `${slug(base)}.mp4`;
      const videoOutPath = path.join(VIDEOS_OUT, videoOutName);
      videoOutNames.add(videoOutName);

      const encodeResult = ffmpeg ? optimizeVideo(srcPath, videoOutPath, ffmpeg) : { ok: false, reason: 'no-ffmpeg' };

      if (encodeResult.ok) {
        if (encodeResult.skipped) {
          videosSkipped += 1;
        } else {
          videosEncoded += 1;
          totalInputBytes += encodeResult.inputSize ?? 0;
          totalOutputBytes += encodeResult.outputSize ?? 0;
          console.log(`  ↳ ${file} : ${encodeResult.formatted}`);
        }
      } else {
        fs.mkdirSync(VIDEOS_OUT, { recursive: true });
        fs.copyFileSync(srcPath, videoOutPath);
        videosCopied += 1;
        console.warn(`  ⚠ ${file} : copie brute (${encodeResult.reason})`);
      }

      const dateMatch = file.match(/(\d{4})-(\d{2})-(\d{2})/);
      const posterOutName = `${slug(base)}.jpg`;
      const posterOutPath = path.join(POSTERS_OUT, posterOutName);
      const { poster, kind: posterKind } = resolveVideoPoster(
        srcPath,
        posterOutName,
        posterOutPath,
        file,
        photos,
      );

      if (posterKind === 'frame') posterFromFrame += 1;
      else posterFromPhoto += 1;

      videos.push({
        src: `/live/videos/${videoOutName}`,
        poster,
        file,
        year: dateMatch ? dateMatch[1] : 'live',
        orientation: getVideoOrientation(srcPath),
      });
    }
  }

  pruneOrphanVideos(videoOutNames);

  const aboutPhoto = photos.find((p) => p.file.includes('2024-06-24-18-47-52')) ?? photos[0] ?? null;

  const livePhotos = photos.map((p) => ({
    src: p.src,
    srcWebp: p.srcWebp,
    srcLarge: p.srcLarge,
    srcLargeWebp: p.srcLargeWebp,
    srcHero: p.srcHero,
    srcHeroWebp: p.srcHeroWebp,
    srcThumb: p.srcThumb,
    srcThumbWebp: p.srcThumbWebp,
    width: p.width,
    height: p.height,
    srcsetWebp: p.srcsetWebp,
    srcsetJpeg: p.srcsetJpeg,
    alt: `H8F4 en live — ${p.year}`,
    year: p.year,
  }));

  const liveVideos = videos
    .sort((a, b) => b.file.localeCompare(a.file))
    .map((v, i) => ({
      src: v.src,
      poster: v.poster,
      title: `Live H8F4 — ${v.year}`,
      year: v.year,
      orientation: v.orientation,
      featured: i < 3,
    }));

  const portraitCount = liveVideos.filter((v) => v.orientation === 'portrait').length;
  const landscapeCount = liveVideos.filter((v) => v.orientation === 'landscape').length;

  const tsContent = `// Généré par scripts/sync-live-assets.mjs — ne pas éditer à la main
export interface LivePhoto {
  src: string;
  srcWebp: string;
  srcLarge: string;
  srcLargeWebp: string;
  srcHero: string;
  srcHeroWebp: string;
  srcThumb: string;
  srcThumbWebp: string;
  width: number;
  height: number;
  srcsetWebp: string;
  srcsetJpeg: string;
  alt: string;
  year: string;
}

export interface LiveVideo {
  src: string;
  poster: string | null;
  title: string;
  year: string;
  orientation: 'portrait' | 'landscape';
  featured?: boolean;
}

export const aboutPhoto: LivePhoto | null = ${JSON.stringify(
    aboutPhoto
      ? livePhotos.find((p) => p.src === aboutPhoto.src) ?? null
      : null,
    null,
    2,
  )};

export const livePhotos: LivePhoto[] = ${JSON.stringify(livePhotos, null, 2)};

export const liveVideos: LiveVideo[] = ${JSON.stringify(liveVideos, null, 2)};
`;

  fs.writeFileSync('src/data/live-assets.ts', tsContent);

  const savedMb = ((totalInputBytes - totalOutputBytes) / (1024 * 1024)).toFixed(1);
  const savedPct = totalInputBytes > 0 ? Math.round(((totalInputBytes - totalOutputBytes) / totalInputBytes) * 100) : 0;

  console.log(`✓ ${photos.length} photos optimisées, ${videos.length} vidéos (${portraitCount} portrait, ${landscapeCount} paysage)`);
  if (ffmpeg) {
    console.log(
      `✓ Vidéos web : ${videosEncoded} ré-encodée(s), ${videosSkipped} en cache` +
        (videosCopied ? `, ${videosCopied} copie(s) brute(s)` : '') +
        (videosEncoded > 0 ? ` — économie ${savedMb} Mo (−${savedPct} %)` : ''),
    );
  } else {
    console.warn('⚠ ffmpeg introuvable — vidéos copiées sans ré-encodage (npm install)');
  }
  console.log(`✓ Aperçus vidéo : ${posterFromFrame} frame extraite, ${posterFromPhoto} repli photo`);
  if (posterFromPhoto > 0) {
    console.warn('⚠ Certaines vidéos utilisent une photo de repli — installez ffmpeg pour des aperçus exacts partout.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
