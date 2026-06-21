# Étape 3 — Choix technique

**Projet :** H8F4 — site vitrine groupe de reprises rock  
**Décision :** ✅ **Astro + Tailwind CSS**  
**Date :** juin 2026

---

## Contexte

| Contrainte | Détail |
|---|---|
| Pages | 1 (+ mentions légales optionnelle) |
| Priorité | Mobile first, performance, SEO |
| Contenu | Statique (texte, photos, vidéos embed, formulaire) |
| Interactivité | Menu burger, scroll ancres, formulaire, lightbox photos (léger) |

---

## Comparatif final

| Critère | Astro + Tailwind | Vue/Nuxt |
|---|---|---|
| One-page vitrine | ✅ Idéal | ⚠️ Surdimensionné |
| Performance mobile | ✅✅ Très peu de JS | ✅ Bon |
| SEO | ✅✅ HTML statique | ✅ Bon (SSR possible) |
| Galerie + lightbox | ✅ Îlot optionnel | ✅ Natif |
| Formulaire contact | ✅ Formspree / Netlify Forms | ✅ |
| Courbe d'apprentissage | ✅ Simple | ⚠️ Plus lourde |
| Maintenance | ✅ Faible | ⚠️ Moyenne |
| Évolution future | ✅ Hybrid rendering si besoin | ✅ Back-office possible |

**Verdict :** Astro couvre 100 % des besoins actuels. Vue/Nuxt n'est justifié que si un back-office ou une app interactive complexe est prévu — ce qui n'est pas le cas.

---

## Stack retenue

```
Astro 5.x
├── @astrojs/tailwind     → styles utilitaires
├── @astrojs/sitemap      → SEO
├── TypeScript            → données répertoire typées
└── Formspree ou Netlify Forms → formulaire booking
```

### Principes d'implémentation

| Règle | Détail |
|---|---|
| Composants `.astro` | Layout, sections statiques (Header, Hero, About, Repertoire, Footer) |
| Pas de framework JS | Sauf îlot si lightbox galerie nécessaire |
| Images | `astro:assets` pour optimisation WebP |
| Vidéos | iframe YouTube lazy-load, pas d'autoplay |
| Déploiement | Netlify ou Vercel (gratuit, formulaires intégrés) |
| Rendering | `static` par défaut, `hybrid` si API route formulaire custom plus tard |

### Commandes d'initialisation (étape dev)

```bash
npm create astro@latest . -- --template minimal --typescript strict
npx astro add tailwind sitemap
```

---

## Formulaire booking

**Option recommandée v1 : Formspree**

- Gratuit jusqu'à 50 soumissions/mois
- Pas de backend à maintenir
- Compatible Astro (form HTML standard)

**Alternative :** Netlify Forms si hébergement Netlify.

Champs : nom, email, téléphone, date, lieu, type d'événement, message.

---

## Assets projet

| Fichier | Usage |
|---|---|
| `assets/logo-no-background.svg` | Header, footer — **peut évoluer**, le design n'en dépend pas |
| `assets/TheH8Full4 - photo.jpg` | Hero et section À propos (photo live B&W) |

---

## Prochaine étape

**Étape 4 — Design system** : voir [`design-system/h8f4/MASTER.md`](./design-system/h8f4/MASTER.md)
