/** Préfixe un chemin public avec le base path Astro (déploiement en sous-dossier). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}
