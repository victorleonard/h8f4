import { bandPhoto } from './band-photo';
import { livePhotos, type LivePhoto } from './live-assets';

const heroLiveSrcs = [
  '/live/photos/photo-2025-06-22-12-22-08-6.jpg',
  '/live/photos/photo-2025-10-13-22-19-46.jpg',
  '/live/photos/photo-2024-06-24-18-47-49.jpg',
  '/live/photos/photo-2025-06-22-12-22-08-5.jpg',
] as const;

function findLivePhoto(src: string): LivePhoto | undefined {
  return livePhotos.find((photo) => photo.src === src);
}

/** Photos du hero — rotation en boucle (+ image originale optimisée). */
export const heroPhotoPool: LivePhoto[] = [
  { ...bandPhoto, alt: bandPhoto.alt },
  ...heroLiveSrcs.map(findLivePhoto).filter((photo): photo is LivePhoto => Boolean(photo)),
];
