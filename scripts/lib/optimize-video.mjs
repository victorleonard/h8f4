import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

/** Incrémenter pour forcer le ré-encodage de toutes les vidéos. */
const ENCODE_VERSION = 'h264-crf28-720-aac96-faststart-v2';

const MAX_EDGE = 720;
const CRF = '28';
const AUDIO_BITRATE = '96k';

const FFMPEG_CANDIDATES = [
  ffmpegStatic,
  'ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/opt/homebrew/opt/ffmpeg/bin/ffmpeg',
].filter(Boolean);

const FFPROBE_CANDIDATES = [
  ffprobeStatic.path,
  'ffprobe',
  '/opt/homebrew/bin/ffprobe',
  '/usr/local/bin/ffprobe',
  '/opt/homebrew/opt/ffmpeg/bin/ffprobe',
].filter(Boolean);

function findBinary(candidates) {
  for (const cmd of candidates) {
    if (!cmd) continue;

    try {
      if (fs.existsSync(cmd)) {
        execFileSync(cmd, ['-version'], { stdio: 'ignore' });
      } else {
        execSync(`"${cmd}" -version`, { stdio: 'ignore' });
      }
      return cmd;
    } catch {
      /* essai suivant */
    }
  }
  return null;
}

export function findFfmpeg() {
  return findBinary(FFMPEG_CANDIDATES);
}

export function findFfprobe() {
  return findBinary(FFPROBE_CANDIDATES);
}

export function getVideoDimensions(filePath, ffprobe = findFfprobe()) {
  if (ffprobe) {
    try {
      const output = execFileSync(
        ffprobe,
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-of',
          'csv=s=x:p=0',
          filePath,
        ],
        { encoding: 'utf8' },
      ).trim();

      const [width, height] = output.split('x').map(Number);
      if (width > 0 && height > 0) return { width, height };
    } catch {
      /* fallback mdls */
    }
  }

  if (process.platform === 'darwin') {
    try {
      const width = Number(
        execSync(`mdls -raw -name kMDItemPixelWidth "${filePath}"`, { stdio: ['pipe', 'pipe', 'ignore'] })
          .toString()
          .trim(),
      );
      const height = Number(
        execSync(`mdls -raw -name kMDItemPixelHeight "${filePath}"`, { stdio: ['pipe', 'pipe', 'ignore'] })
          .toString()
          .trim(),
      );
      if (width > 0 && height > 0) return { width, height };
    } catch {
      /* ignore */
    }
  }

  return null;
}

export function getVideoOrientation(filePath, ffprobe = findFfprobe()) {
  const dimensions = getVideoDimensions(filePath, ffprobe);
  if (!dimensions) return 'landscape';
  return dimensions.height > dimensions.width ? 'portrait' : 'landscape';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function buildStamp(srcPath) {
  const stat = fs.statSync(srcPath);
  return `${ENCODE_VERSION}:${stat.mtimeMs}:${stat.size}`;
}

function isCacheValid(srcPath, outPath) {
  const stampPath = `${outPath}.stamp`;
  if (!fs.existsSync(outPath) || !fs.existsSync(stampPath)) return false;
  if (fs.statSync(outPath).size === 0) return false;
  return fs.readFileSync(stampPath, 'utf8') === buildStamp(srcPath);
}

/**
 * Ré-encode une vidéo pour le web : H.264 1280 px max, AAC 128k, faststart.
 * Saute l'encodage si la source n'a pas changé (fichier .stamp versionné).
 */
export function optimizeVideo(srcPath, outPath, ffmpeg = findFfmpeg()) {
  if (!ffmpeg) {
    return { ok: false, reason: 'no-ffmpeg' };
  }

  if (isCacheValid(srcPath, outPath)) {
    return { ok: true, skipped: true };
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const inputSize = fs.statSync(srcPath).size;

  try {
    execFileSync(
      ffmpeg,
      [
        '-y',
        '-i',
        srcPath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-crf',
        CRF,
        '-preset',
        'slow',
        '-vf',
        `scale='min(${MAX_EDGE},iw)':'min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease`,
        '-c:a',
        'aac',
        '-b:a',
        AUDIO_BITRATE,
        '-movflags',
        '+faststart',
        '-pix_fmt',
        'yuv420p',
        outPath,
      ],
      { stdio: 'ignore' },
    );
  } catch {
    return { ok: false, reason: 'encode-failed' };
  }

  if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
    return { ok: false, reason: 'empty-output' };
  }

  const outputSize = fs.statSync(outPath).size;
  const saved = Math.max(0, inputSize - outputSize);
  const ratio = inputSize > 0 ? Math.round((saved / inputSize) * 100) : 0;

  fs.writeFileSync(`${outPath}.stamp`, buildStamp(srcPath));

  return {
    ok: true,
    skipped: false,
    inputSize,
    outputSize,
    saved,
    ratio,
    formatted: `${formatBytes(inputSize)} → ${formatBytes(outputSize)} (−${ratio} %)`,
  };
}
