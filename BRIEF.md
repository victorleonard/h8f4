# Brief — Site web groupe de rock (reprises)

## Contexte

Création d'un site internet pour **H8F4**, groupe de rock qui joue **exclusivement des reprises** de groupes existants.

---

## Objectifs du site

- **Présenter le groupe** : identité, membres, ambiance, style musical
- **Galerie média** : photos et vidéos (live, répétitions, coulisses)
- **Formulaire de contact** : recueillir des demandes pour organiser des concerts
- **Mobile first** : site optimisé pour consultation sur smartphone

---

## Structure du site

| Contrainte      | Détail                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Nombre de pages | **1 page** idéalement, **2 pages maximum**                                                                            |
| Navigation      | Ancres ou scroll fluide sur une page unique ; page secondaire optionnelle (ex. galerie détaillée ou mentions légales) |

### Sections envisagées (page unique)

1. **Hero** — Nom du groupe, accroche, visuel fort
2. **À propos** — Présentation, style, énergie live
3. **Répertoire** — Liste des reprises jouées
4. **Médias** — Photos et vidéos intégrées
5. **Contact / Booking** — Formulaire pour demandes de concerts
6. **Footer** — Réseaux sociaux, mentions légales

---

## Répertoire

| Titre                       | Artiste / groupe d'origine (référence) |
| --------------------------- | -------------------------------------- |
| Beds Are Burning            | Midnight Oil                           |
| Take Me Out                 | Franz Ferdinand                        |
| Boys Don't Cry              | The Cure                               |
| Time Is Running Out         | Muse                                   |
| I Wanna Be Your Slave       | Måneskin                               |
| Fortunate Son               | Creedence Clearwater Revival           |
| Paranoid                    | Black Sabbath                          |
| House of the Rising Sun     | The Animals                            |
| Whole Lotta Love            | Led Zeppelin                           |
| Dream On                    | Aerosmith                              |
| The Loneliest               | Måneskin                               |
| Where Is My Mind?           | Pixies                                 |
| Holiday                     | Green Day                              |
| Come Out and Play           | The Offspring                          |
| Song 2                      | Blur                                   |
| Dad Algorithm               | —                                      |
| Seven Nation Army           | The White Stripes                      |
| Beautiful Things            | Benson Boone                           |
| Smells Like Teen Spirit     | Nirvana                                |
| I Love Rock 'n Roll         | Joan Jett                              |
| Small Print                 | Muse                                   |
| Given Up                    | Linkin Park                            |
| Emptiness Machine           | Linkin Park                            |
| Bullet with Butterfly Wings | The Smashing Pumpkins                  |
| Zombie                      | The Cranberries                        |
| Highway to Hell             | AC/DC                                  |

---

## Phase 1 — Benchmark

Analyse des sites de groupes de rock / cover bands existants pour définir le thème visuel et l'expérience utilisateur.

**Livrable :** [`BENCHMARK.md`](./BENCHMARK.md)

---

## Choix technique — Framework

**Décision :** ✅ **Astro + Tailwind CSS** — voir [`STACK.md`](./STACK.md)

---

## Exigences techniques

- **Responsive / mobile first** : conception pensée smartphone en priorité
- **Performance** : images optimisées, lazy loading vidéos
- **Accessibilité** : contrastes, navigation clavier, labels formulaire
- **SEO** : métadonnées, Open Graph pour partage réseaux sociaux
- **Formulaire** : nom, email, téléphone, date souhaitée, lieu, message — envoi par service (Formspree, Netlify Forms, API custom…)

---

## Identité & assets

| Élément | Fichier | Note |
|---|---|---|
| Nom du groupe | **H8F4** | — |
| Logo | `assets/logo-no-background.svg` | Peut évoluer — le design n'en dépend pas |
| Photo live | `assets/TheH8Full4 - photo.jpg` | Hero + section À propos (B&W, énergie scène) |

---

## Prochaines étapes

1. ~~**Benchmark**~~ — ✅ [`BENCHMARK.md`](./BENCHMARK.md)
2. ~~**Wireframe**~~ — ✅ [`WIREFRAME.md`](./WIREFRAME.md)
3. ~~**Choix framework**~~ — ✅ [`STACK.md`](./STACK.md) — Astro + Tailwind
4. ~~**Design system**~~ — ✅ [`design-system/h8f4/MASTER.md`](./design-system/h8f4/MASTER.md)
5. ~~**Développement**~~ — ✅ Site Astro initialisé (`npm run dev`)
6. **Tests mobile** — Vérification sur plusieurs tailles d'écran
7. **Mise en ligne** — Hébergement (Netlify, Vercel, etc.)
