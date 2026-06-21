import { brandFull, brandSeo, brandShort } from './brand';

/** Nom de la région (schema.org, titres courts). */
export const serviceRegion = 'Pays de la Loire';

/** Formulation avec préposition : « dans les Pays de la Loire ». */
export const serviceRegionIn = 'dans les Pays de la Loire';

/** Villes citées à titre d'exemple (non exhaustif). */
export const serviceCityExamples = [
  'Nantes',
  'Angers',
  'Laval',
  'Châteaubriant',
  'Ancenis',
  'Segré',
] as const;

function formatCityList(cities: readonly string[]): string {
  if (cities.length <= 1) return cities[0] ?? '';
  return `${cities.slice(0, -1).join(', ')} et ${cities[cities.length - 1]}`;
}

export const serviceCityExamplesText = formatCityList(serviceCityExamples);

export const serviceAreaPhrase = `${serviceRegionIn} et alentours, notamment à ${serviceCityExamplesText}`;

export const metaTitle = `${brandSeo} — Groupe de reprises rock ${serviceRegionIn}`;

export const metaDescription =
  `${brandSeo}, groupe de reprises rock ${serviceRegionIn}. 26 titres live pour bars, festivals et événements privés, notamment à ${serviceCityExamplesText}.`;

export const heroH1 =
  `${brandSeo} — Groupe de reprises rock ${serviceRegionIn}. ${serviceAreaPhrase.charAt(0).toUpperCase()}${serviceAreaPhrase.slice(1)}.`;

export const shareImagePath = '/og-image.png';
export const shareImageWidth = 1200;
export const shareImageHeight = 1200;
export const shareImageType = 'image/png';
export const shareImageAlt = `${brandShort} — groupe de reprises rock ${serviceRegionIn}`;
export const siteName = brandShort;

export function buildMusicGroupSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: brandFull,
    alternateName: brandShort,
    description: metaDescription,
    url: siteUrl,
    genre: ['Rock', 'Hard rock'],
    areaServed: {
      '@type': 'AdministrativeArea',
      name: serviceRegion,
    },
  };
}
