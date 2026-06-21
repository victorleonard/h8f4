# Propositions de titres — documentation

Espace interne permettant aux membres du groupe **H8F4** de proposer des reprises à ajouter au répertoire et de les noter.

**URL de la page :** `/propal` (ex. `https://h8f4.fr/propal`)

---

## Fonctionnement

1. Chaque membre **choisit son compte** au premier accès (liste stockée dans Redis).
2. Le choix est mémorisé dans le navigateur (`localStorage`) — pas de mot de passe.
3. Un membre peut **proposer** un titre (nom + artiste optionnel).
4. Chaque membre peut **noter chaque titre de 1 à 5** (modifiable ou retirable).
5. Les propositions sont **classées par note moyenne**.
6. Pour chaque titre, on voit **qui l'a proposé** et **qui a noté** (avec la note).

> **Confiance :** il n'y a pas d'authentification. Le système repose sur le choix honnête du compte membre. Les identifiants sont validés côté serveur à partir des comptes enregistrés en base.

---

## Comptes membres

Les comptes sont stockés dans **Redis** et chargés automatiquement sur la page `/propal`. Il n'y a pas d'interface d'administration : les membres se configurent directement dans [Upstash](https://console.upstash.com/).

### Ajouter un membre dans Upstash

Pour chaque membre, deux opérations :

1. **SADD** sur la clé `propal:members` — ajouter l'identifiant (ex. `victor`)
2. **SET** sur la clé `propal:member:victor` — valeur JSON :

```json
{"id":"victor","label":"Victor","createdAt":"2026-06-21T12:00:00.000Z"}
```

| Champ   | Rôle                                              |
| ------- | ------------------------------------------------- |
| `id`    | Identifiant stable (slug, sans espaces)           |
| `label` | Nom affiché dans l'interface et dans les notes |

- L'`id` ne doit **pas** être modifié après création (l'historique des propositions et notes y fait référence).
- Seuls les `id` présents en base sont acceptés par l'API.

---

## Stockage — Upstash Redis

Les propositions et notes sont stockés dans [Upstash Redis](https://upstash.com/) (offre gratuite suffisante pour un usage interne).

### 1. Créer une base Redis

1. Créer un compte sur [console.upstash.com](https://console.upstash.com/).
2. **Create Database** → région proche de l'hébergement (ex. `eu-west-1` pour Vercel EU).
3. Copier **UPSTASH_REDIS_REST_URL** et **UPSTASH_REDIS_REST_TOKEN**.

### 2. Variables d'environnement

Ajouter dans `.env` (local) et dans les variables du projet Vercel :

```env
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

Voir aussi `.env.example`.

### 3. Modèle de données Redis

| Clé                         | Type   | Contenu                                      |
| --------------------------- | ------ | -------------------------------------------- |
| `propal:members`            | SET    | IDs des comptes membres                      |
| `propal:member:{id}`        | STRING | JSON : id, label, date de création           |
| `propal:proposals`          | ZSET   | IDs des propositions, score = note moyenne |
| `propal:item:{id}`          | STRING | JSON : titre, artiste, auteur, date, `artworkUrl`, `spotifyUrl`, `deezerUrl`, `youtubeUrl` (optionnels) |
| `propal:ratings:{id}`       | HASH   | Notes par membre (`memberId` → `1`–`5`) |

---

## Déploiement

Le site peut être déployé sur **Vercel** (adaptateur historique) ou en **Docker sur un VPS** (recommandé pour OVH).

### Docker (VPS)

Voir le guide complet : **[@docker/README.md](../@docker/README.md)**

```bash
cp .env.example .env
docker compose -f @docker/docker-compose.yml build
docker compose -f @docker/docker-compose.yml up -d
```

### Vercel (alternative)

Ancienne cible possible ; le projet utilise désormais `@astrojs/node` pour Docker. Pour Vercel, réinstaller `@astrojs/vercel` et adapter `astro.config.mjs`.

### Prérequis communs

- Base Upstash configurée (voir ci-dessus)
- Comptes membres configurés dans Upstash Redis

### Développement local

```bash
cp .env.example .env
# Renseigner UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN

npm run dev
```

Ouvrir `http://localhost:4321/propal`.

> Sans variables Upstash, la page s'affiche mais les appels API renvoient une erreur 503.

---

## API (référence)

| Méthode | Route                    | Description                    |
| ------- | ------------------------ | ------------------------------ |
| `GET`   | `/api/propal`            | Liste des propositions + membres |
| `GET`   | `/api/propal/search`     | Recherche de titres (iTunes)     |
| `POST`  | `/api/propal/proposals`  | Créer une proposition            |
| `DELETE`| `/api/propal/proposals`  | Supprimer sa proposition         |
| `POST`  | `/api/propal/vote`       | Noter ou retirer sa note         |

### Recherche de titres

```
GET /api/propal/search?q=creep+radiohead
```

Réponse :

```json
{
  "results": [
    { "title": "Creep", "artist": "Radiohead", "album": "Pablo Honey", "artworkUrl": "https://…" }
  ]
}
```

Proxy vers l'**[API iTunes Search](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)** (gratuite, sans clé API). Les pochettes (`artworkUrl100`) sont renvoyées en 200×200 px et enregistrées avec la proposition si sélectionnée depuis la recherche.

**Alternatives gratuites** (non intégrées, mais possibles) :

| API | Avantages | Inconvénients |
| --- | --------- | ------------- |
| **iTunes Search** ✅ utilisée | Gratuite, sans clé, titre + artiste + album | Catalogue orienté Apple Music |
| **MusicBrainz** | Open data, très complète | 1 req/s, User-Agent obligatoire |
| **Discogs** | Bon pour les versions / pressages | Clé API requise |
| **Spotify** | Catalogue riche | OAuth + quotas, plus complexe |

### Créer une proposition

```json
POST /api/propal/proposals
{
  "title": "Creep",
  "artist": "Radiohead",
  "memberId": "victor",
  "artworkUrl": "https://is5-ssl.mzstatic.com/…/200x200bb.jpg"
}
```

Le champ `artworkUrl` est enregistré dans Redis avec la proposition lorsqu'un titre est choisi via la recherche iTunes.

À la création, les liens **Spotify**, **Deezer** et **YouTube** sont résolus automatiquement :

| Service | API | Sans configuration |
| ------- | --- | ------------------ |
| Deezer | API publique gratuite → lien direct morceau si trouvé | Lien de recherche Deezer |
| Spotify | API Spotify (Client Credentials) si `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` | Lien de recherche Spotify |
| YouTube | YouTube Data API v3 si `YOUTUBE_API_KEY` | Lien de recherche YouTube |

Les propositions existantes sans liens enregistrés affichent un lien de recherche généré à partir du titre et de l'artiste.

#### Supprimer sa proposition

Réservé à l'auteur (`proposedBy`). Efface aussi les notes associées.

```json
DELETE /api/propal/proposals
{
  "id": "uuid-de-la-proposition",
  "memberId": "victor"
}
```

### Noter un titre

```json
POST /api/propal/vote
{
  "proposalId": "uuid-de-la-proposition",
  "memberId": "victor",
  "rating": 4
}
```

`rating` : entier de **1 à 5**. Chaque membre peut noter **chaque** proposition (une note par titre).

### Retirer sa note

```json
POST /api/propal/vote
{
  "proposalId": "uuid-de-la-proposition",
  "memberId": "victor",
  "action": "remove"
}
```

---

## Confidentialité et indexation

La page est destinée au groupe. Pour éviter l'indexation par les moteurs de recherche :

```env
PUBLIC_NOINDEX=true
```

Ou ajouter un `noindex` uniquement sur `/propal` si besoin.

Ne partagez l'URL `/propal` qu'avec les membres du groupe.

---

## Fichiers concernés

| Fichier                          | Rôle                              |
| -------------------------------- | --------------------------------- |
| `src/pages/propal.astro`         | Page principale                   |
| `src/scripts/propal.ts`          | Logique client (compte, notes)    |
| `src/lib/propal-members-store.ts`| Stockage Redis des membres      |
| `src/lib/propal-store.ts`        | Accès Redis                       |
| `src/pages/api/propal/*.ts`      | Routes API                        |
| `astro.config.mjs`               | Adaptateur Node (standalone)      |
| `@docker/`                       | Dockerfile, compose, guide VPS    |
