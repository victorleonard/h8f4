# Propositions de titres — documentation

Espace interne permettant aux membres du groupe **H8F4** de proposer des reprises à ajouter au répertoire et de les noter.

**URL de la page :** `/propal` (ex. `https://h8f4.fr/propal`)

---

## Fonctionnement

1. Chaque membre **choisit son compte** au premier accès (liste stockée en base SQLite).
2. Le choix est mémorisé dans le navigateur (`localStorage`) — pas de mot de passe.
3. Un membre peut **proposer** un titre (nom + artiste optionnel).
4. Chaque membre peut **noter chaque titre de 1 à 5** (modifiable ou retirable).
5. Les propositions sont **classées par note moyenne**.
6. Pour chaque titre, on voit **qui l'a proposé** et **qui a noté** (avec la note).

> **Confiance :** il n'y a pas d'authentification. Le système repose sur le choix honnête du compte membre. Les identifiants sont validés côté serveur à partir des comptes enregistrés en base.

---

## Comptes membres

Les comptes sont stockés dans **SQLite** et chargés automatiquement sur la page `/propal`. L'ajout et la modification se font via **Admin** (mot de passe `PROPAL_ADMIN_PASSWORD` dans `.env`).

### Ajouter un membre (interface)

1. Se connecter, cliquer sur l'avatar puis **Admin**
2. Saisir le mot de passe admin
3. Ajouter ou modifier les membres

### Ajouter un membre (script)

1. Éditer `data/propal-members.example.json` (ou créer un fichier JSON dédié) :

```json
[
  { "id": "victor", "label": "Victor" },
  { "id": "rom", "label": "Rom" }
]
```

2. Lancer le seed :

```bash
npm run seed:propal-members
# ou avec un fichier personnalisé :
node scripts/seed-propal-members.mjs data/mes-membres.json
```

| Champ   | Rôle                                           |
| ------- | ---------------------------------------------- |
| `id`    | Identifiant stable (slug, sans espaces)        |
| `label` | Nom affiché dans l'interface et dans les notes |

- L'`id` ne doit **pas** être modifié après création (l'historique des propositions et notes y fait référence).
- Seuls les `id` présents en base sont acceptés par l'API.
- Le script utilise `INSERT OR IGNORE` : relancer le seed n'écrase pas les membres existants.

---

## Stockage — SQLite

Les propositions et notes sont stockées dans un fichier **SQLite** local (`propal.db`). Aucun service externe requis.

### 1. Chemin de la base

Variable d'environnement (voir `.env.example`) :

```env
PROPAL_DB_PATH=./data/propal.db
PROPAL_ADMIN_PASSWORD=votre_mot_de_passe
```

Sous Docker, le volume `data/` est monté sur `/app/data` et la variable est définie à `/app/data/propal.db`.

La base et les tables sont **créées automatiquement** au premier accès si le fichier n'existe pas.

`PROPAL_ADMIN_PASSWORD` protège l'accès Admin (ajout / modification des membres via l'interface ou l'API).

### 2. Schéma

| Table       | Contenu                                          |
| ----------- | ------------------------------------------------ |
| `members`   | Comptes membres (id, label, date de création)    |
| `proposals` | Titres proposés (titre, artiste, auteur, liens…) |
| `ratings`   | Notes par membre et par proposition (1–5)        |

### 3. Sauvegarde

Copier le fichier `data/propal.db` suffit. Sous Docker :

```bash
cp data/propal.db data/propal.db.backup
# ou depuis l'hôte si le volume est monté
```

---

## Déploiement

Le site est déployé en **Docker sur un VPS** (adaptateur `@astrojs/node` en mode standalone).

### Docker (VPS)

Voir le guide complet : **[@docker/README.md](../@docker/README.md)**

```bash
cp .env.example .env
mkdir -p data
npm run seed:propal-members
docker compose -f @docker/docker-compose.yml build
docker compose -f @docker/docker-compose.yml up -d
```

### Prérequis

- Dossier `data/` avec la base SQLite (volume Docker)
- Comptes membres seedés (`npm run seed:propal-members`)

### Développement local

```bash
cp .env.example .env
mkdir -p data
npm run seed:propal-members
npm run dev
```

Ouvrir `http://localhost:4321/propal`.

> Sans membres seedés, la page s'affiche mais aucun compte n'est disponible à la sélection.

---

## Scripts utiles

| Commande                      | Rôle                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `npm run seed:propal-members` | Insère les membres depuis `data/propal-members.example.json` |
| `npm run seed:propal-rom`     | Ajoute des titres de démo (membre `rom` requis)              |

---

## API (référence)

| Méthode  | Route                   | Description                      |
| -------- | ----------------------- | -------------------------------- |
| `GET`    | `/api/propal`           | Liste des propositions + membres |
| `GET`    | `/api/propal/search`    | Recherche de titres (iTunes)     |
| `POST`   | `/api/propal/proposals` | Créer une proposition            |
| `DELETE` | `/api/propal/proposals` | Supprimer sa proposition         |
| `POST`   | `/api/propal/vote`      | Noter ou retirer sa note         |

### Recherche de titres

```
GET /api/propal/search?q=creep+radiohead
```

Réponse :

```json
{
  "results": [
    {
      "title": "Creep",
      "artist": "Radiohead",
      "album": "Pablo Honey",
      "artworkUrl": "https://…"
    }
  ]
}
```

Proxy vers l'**[API iTunes Search](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)** (gratuite, sans clé API). Les pochettes (`artworkUrl100`) sont renvoyées en 200×200 px et enregistrées avec la proposition si sélectionnée depuis la recherche.

**Alternatives gratuites** (non intégrées, mais possibles) :

| API                           | Avantages                                   | Inconvénients                   |
| ----------------------------- | ------------------------------------------- | ------------------------------- |
| **iTunes Search** ✅ utilisée | Gratuite, sans clé, titre + artiste + album | Catalogue orienté Apple Music   |
| **MusicBrainz**               | Open data, très complète                    | 1 req/s, User-Agent obligatoire |
| **Discogs**                   | Bon pour les versions / pressages           | Clé API requise                 |
| **Spotify**                   | Catalogue riche                             | OAuth + quotas, plus complexe   |

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

Le champ `artworkUrl` est enregistré en base avec la proposition lorsqu'un titre est choisi via la recherche iTunes.

À la création, les liens **Spotify**, **Deezer** et **YouTube** sont résolus automatiquement :

| Service | API                                                                               | Sans configuration        |
| ------- | --------------------------------------------------------------------------------- | ------------------------- |
| Deezer  | API publique gratuite → lien direct morceau si trouvé                             | Lien de recherche Deezer  |
| Spotify | API Spotify (Client Credentials) si `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` | Lien de recherche Spotify |
| YouTube | YouTube Data API v3 si `YOUTUBE_API_KEY`                                          | Lien de recherche YouTube |

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

| Fichier                            | Rôle                           |
| ---------------------------------- | ------------------------------ |
| `src/pages/propal.astro`           | Page principale                |
| `src/scripts/propal.ts`            | Logique client (compte, notes) |
| `src/lib/db.ts`                    | Connexion SQLite               |
| `src/lib/propal-schema.ts`         | Schéma SQL                     |
| `src/lib/propal-members-store.ts`  | Accès membres                  |
| `src/lib/propal-store.ts`          | Accès propositions et notes    |
| `src/pages/api/propal/*.ts`        | Routes API                     |
| `data/propal-members.example.json` | Exemple de membres à seeder    |
| `scripts/seed-propal-members.mjs`  | Seed des comptes membres       |
| `@docker/`                         | Dockerfile, compose, guide VPS |
