# Design System — H8F4

> **LOGIC:** Pour une page spécifique, vérifier d'abord `design-system/h8f4/pages/[page].md`.
> Si le fichier existe, ses règles **remplacent** ce Master.
> Sinon, suivre strictement ce document.

**Projet :** H8F4 — groupe de reprises rock  
**Direction :** Dark Rock Energy  
**Généré :** juin 2026

---

## Principes directeurs

1. **Le design ne dépend pas du logo actuel** — le logo (`logo-no-background.svg`) est un asset interchangeable ; la palette et la typo restent stables même si le logo évolue.
2. **Photo live comme ancrage visuel** — `TheH8Full4 - photo.jpg` (B&W, énergie scène) inspire le ton, pas les couleurs du logo.
3. **Mobile first** — concevoir à 375 px, enrichir à 768 px et 1280 px.
4. **Conversion booking** — CTA visible, formulaire accessible en ≤ 3 interactions.

---

## Palette de couleurs

Thème sombre à fort contraste, indépendant des gris du logo.

| Rôle | Hex | CSS Variable | Usage |
|---|---|---|---|
| Fond page | `#0A0A0A` | `--color-bg` | Body, sections principales |
| Fond alterné | `#121212` | `--color-bg-alt` | Répertoire, contact |
| Surface / carte | `#1A1A1A` | `--color-surface` | Cartes morceaux, champs formulaire |
| Bordure | `#2A2A2A` | `--color-border` | Cartes, inputs, séparateurs |
| Texte principal | `#F5F5F5` | `--color-text` | Titres, corps |
| Texte secondaire | `#A0A0A0` | `--color-text-muted` | Artistes, labels, footer |
| Accent primaire | `#FF6B35` | `--color-accent` | CTA, liens actifs, focus |
| Accent hover | `#E63946` | `--color-accent-hover` | Hover boutons, bordures actives |
| Succès | `#22C55E` | `--color-success` | Confirmation formulaire |
| Erreur | `#EF4444` | `--color-error` | Validation formulaire |

**Notes :** orange chaud pour les CTA (lisible sur fond sombre, contraste WCAG AA). Pas de teinte tirée du logo gris/clair.

### Tailwind config (extrait)

```js
colors: {
  bg: { DEFAULT: '#0A0A0A', alt: '#121212' },
  surface: '#1A1A1A',
  border: '#2A2A2A',
  text: { DEFAULT: '#F5F5F5', muted: '#A0A0A0' },
  accent: { DEFAULT: '#FF6B35', hover: '#E63946' },
}
```

---

## Typographie

| Rôle | Font | Poids | Usage |
|---|---|---|---|
| Titres / H2 | **Russo One** | 400 | Sections, impact rock |
| Corps | **Poppins** | 400, 500, 600 | Texte, boutons, cartes |
| H1 sr-only | Russo One | 400 | SEO : « H8F4 — Groupe de reprises rock » |

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Russo+One&display=swap');

--font-display: 'Russo One', sans-serif;
--font-body: 'Poppins', sans-serif;
```

### Échelle typographique

| Token | Mobile | Desktop |
|---|---|---|
| `--text-hero` | 32 px | 48 px |
| `--text-h2` | 28 px | 36 px |
| `--text-h3` | 18 px | 22 px |
| `--text-body` | 15 px | 16 px |
| `--text-small` | 12 px | 13 px |
| `--text-cta` | 15 px | 16 px |

---

## Espacement

| Token | Valeur | Usage |
|---|---|---|
| `--space-xs` | 4 px | Gaps serrés |
| `--space-sm` | 8 px | Grille photos |
| `--space-md` | 16 px | Padding horizontal mobile |
| `--space-lg` | 24 px | Padding tablette |
| `--space-xl` | 32 px | Padding desktop, footer |
| `--space-2xl` | 48 px | Gaps internes sections |
| `--space-3xl` | 64 px | Marge entre sections (mobile) |
| `--space-4xl` | 96 px | Marge entre sections (desktop) |

**Max-width contenu :** 1200 px, centré.

---

## Effets visuels

| Effet | Valeur | Où |
|---|---|---|
| Overlay hero | `linear-gradient(transparent 30%, #0A0A0A 100%)` | Hero |
| Grain texture | SVG noise, opacity 5 % | Hero uniquement |
| Photo traitement | `grayscale(100%) contrast(1.1)` optionnel sur hero | Cohérence avec photo B&W |
| Transitions | `200ms ease` | Hover, focus, menu |
| Fade-in scroll | `opacity 0→1, translateY 12px→0` | Sections (CSS, `prefers-reduced-motion: reduce` → off) |
| Ombres | Minimal — `0 4px 20px rgba(0,0,0,0.4)` sur cartes | Cartes répertoire |

**Éviter :** parallax, glitch, néon cyberpunk, animations lourdes.

---

## Composants

### Header

```
Hauteur : 56px mobile / 72px desktop
Fond : #0A0A0A à 90% + backdrop-blur(8px)
Logo : hauteur 32px mobile / 40px desktop (SVG, couleur blanche via CSS filter ou fill)
Nav desktop : Poppins 500, 14px, liens #F5F5F5, actif souligné accent
Bouton CTA header : btn-primary compact
```

### Bouton primaire (CTA)

```css
.btn-primary {
  background: var(--color-accent);
  color: #FFFFFF;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15px;
  padding: 14px 28px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 200ms ease, transform 200ms ease;
}
.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Bouton secondaire

```css
.btn-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 14px 28px;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 200ms ease;
}
.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

### Carte répertoire

```css
.song-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: default;
  transition: border-color 200ms ease, transform 200ms ease;
}
.song-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.song-card__title { font-weight: 600; font-size: 14px; color: var(--color-text); }
.song-card__artist { font-size: 12px; color: var(--color-text-muted); }
```

### Champs formulaire

```css
.input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px; /* évite zoom iOS */
  color: var(--color-text);
  width: 100%;
  transition: border-color 200ms ease;
}
.input:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
}
.input::placeholder { color: var(--color-text-muted); }
```

### Menu mobile

```
Fond : #0A0A0A
Liens : Russo One 24px, espacement 32px vertical
Animation : slide-in-right 200ms
CTA : btn-primary pleine largeur en bas du menu
```

### Sticky CTA mobile

```
Position : fixed bottom, z-50
Hauteur : 56px
Fond : #0A0A0A + bordure top #2A2A2A
Masqué quand #contact visible (Intersection Observer léger)
```

---

## Icônes

- **Set :** Lucide Icons (SVG inline)
- **Taille :** 20 px (nav), 24 px (footer social)
- **Couleur :** `#A0A0A0`, hover `#F5F5F5`
- **Interdit :** emojis comme icônes

---

## Images & médias

| Asset | Traitement |
|---|---|
| `TheH8Full4 - photo.jpg` | Hero : cover, overlay sombre. À propos : ratio 4:3, coins 8px |
| Logo SVG | Affiché en blanc (`filter: brightness(0) invert(1)`) — indépendant des couleurs internes du fichier |
| Galerie future | WebP via `astro:assets`, lazy load, alt descriptif |
| Vidéos | YouTube embed 16:9, `loading="lazy"`, pas d'autoplay |

---

## Contenu éditorial

| Élément | Texte |
|---|---|
| Nom | **H8F4** |
| Tagline | *Du rock iconique, live et sans compromis* |
| CTA principal | *Réserver le groupe* |
| CTA secondaire | *Voir le répertoire* |
| Meta title | `H8F4 — Groupe de reprises rock \| Booking` |
| Meta description | `H8F4, groupe de reprises rock. 27 classiques live — booking pour bars, festivals et événements privés.` |

---

## Pattern de page

**Scroll storytelling** — une page, sections empilées, CTA répété (hero + avant formulaire + sticky mobile).

Ordre : Hero → À propos → Répertoire → Médias → Contact → Footer

---

## Anti-patterns

- ❌ Adapter la palette aux gris du logo actuel
- ❌ Fond clair / look corporate
- ❌ Autoplay audio ou vidéo
- ❌ Formulaire caché ou contact email seul
- ❌ Plus de 3 clics pour atteindre le booking
- ❌ Emojis comme icônes
- ❌ `scale` hover qui décale le layout
- ❌ Texte secondaire sous 4.5:1 de contraste

---

## Checklist pré-livraison

- [ ] Contraste texte vérifié (WCAG AA)
- [ ] `cursor-pointer` sur tous les éléments cliquables
- [ ] Focus visible clavier
- [ ] `prefers-reduced-motion` respecté
- [ ] Responsive testé : 375, 768, 1024, 1440 px
- [ ] Logo affiché mais design autonome si logo remplacé
- [ ] Photo H8F4 intégrée hero + à propos
- [ ] Pas de scroll horizontal mobile
- [ ] Formulaire labels + aria associés
