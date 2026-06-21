# Page Override — index (homepage)

> Règles spécifiques à la page d'accueil. Remplacent le Master quand elles diffèrent.

**Page :** `/` — one-page H8F4

---

## Hero

| Propriété | Valeur |
|---|---|
| Média fond | `assets/TheH8Full4 - photo.jpg` en cover |
| Overlay | Gradient sombre + grain 5 % |
| Logo | Centré, 70 % largeur max (mobile), indépendant de la palette |
| H1 sr-only | `H8F4 — Groupe de reprises rock` |
| Tagline visible | *Du rock iconique, live et sans compromis* |
| CTA | « Réserver le groupe » → `#contact` |
| Hauteur | `100svh` min 500 px |

Pas de vidéo en v1 — la photo live suffit. Vidéo YouTube déplacée en section Médias.

---

## À propos

| Propriété | Valeur |
|---|---|
| Photo | Même `TheH8Full4 - photo.jpg` ou recadrage différent |
| Stats optionnelles | `27` titres · `100%` rock · `Live` only |
| Témoignage | Placeholder jusqu'à citation réelle |

**Bio placeholder :**

> H8F4 est un groupe de reprises rock qui fait vibrer les classiques — de Nirvana à Queen, de Muse aux Cranberries. Sur scène, l'énergie et la précision sont au rendez-vous.

---

## Répertoire

- 27 cartes, ordre alphabétique par titre
- Fond section : `--color-bg-alt` (`#121212`)
- CTA secondaire en bas de section

---

## Médias

- v1 : 1 vidéo YouTube (placeholder) + photo hero réutilisée en galerie
- Grille photos : 2 col mobile, 4 col desktop
- Lightbox : optionnel v1, prévu v2

---

## Contact

- Fond `--color-bg-alt`
- Formulaire Formspree (endpoint à configurer au dev)
- Coordonnées placeholder : `contact@h8f4.fr` / téléphone TBD
- Message réassurance : *Réponse sous 48h*

---

## SEO / Open Graph

```html
<title>H8F4 — Groupe de reprises rock | Booking</title>
<meta name="description" content="H8F4, groupe de reprises rock. 27 classiques live — booking pour bars, festivals et événements privés." />
<meta property="og:image" content="/og-h8f4.jpg" /> <!-- générer à partir de la photo -->
<meta property="og:title" content="H8F4 — Groupe de reprises rock" />
```
