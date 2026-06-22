import type { PropalListResponse, PropalMember, PropalProposalView } from "../lib/propal-types";
import { withBase } from "../utils/path";

const STORAGE_KEY = "h8f4-propal-member";
const SEARCH_DEBOUNCE_MS = 350;

type PropalView = "pending" | "ranking" | "propose";
type ListFilter = "all" | "rated" | "mine";

interface RankedProposal {
  proposal: PropalProposalView;
  rank: number | null;
}

function withRanks(proposals: PropalProposalView[]): RankedProposal[] {
  let rank = 0;

  return proposals.map((proposal) => {
    if (proposal.ratingCount === 0) {
      return { proposal, rank: null };
    }

    rank += 1;
    return { proposal, rank };
  });
}

interface SongSearchResult {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
}

const ICON_ARTWORK_PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

const ICON_SPOTIFY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.13-10.56-1.14-.399.12-.779-.18-.899-.54-.12-.42.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

const ICON_DEEZER = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.81 4.16v3.03h3.03V4.16h-3.03zM4.16 8.32v3.03h3.03V8.32H4.16zm0 4.06v3.03h3.03v-3.03H4.16zm4.06 0v3.03h3.03v-3.03H8.22zm4.07 0v3.03h3.03v-3.03h-3.03zm4.06 0v3.03h3.03v-3.03h-3.03zM4.16 16.44v3.03h3.03v-3.03H4.16zm4.06 0v3.03h3.03v-3.03H8.22zm4.07 0v3.03h3.03v-3.03h-3.03zm4.06 0v3.03h3.03v-3.03h-3.03z"/></svg>`;

const ICON_YOUTUBE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.7 15.5V8.5L15.8 12l-6.1 3.5z"/></svg>`;

function apiUrl(path: string): string {
  return withBase(path);
}

function getStoredMemberId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredMemberId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

function memberInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "?";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderArtwork(
  artworkUrl: string | undefined,
  label: string,
  size: "sm" | "md",
): string {
  const className = size === "sm" ? "propal-artwork propal-artwork--sm" : "propal-artwork propal-artwork--md";
  const dimension = size === "sm" ? 64 : 80;

  if (!artworkUrl) {
    return `<span class="${className} propal-artwork--placeholder" aria-hidden="true">${ICON_ARTWORK_PLACEHOLDER}</span>`;
  }

  return `<img src="${escapeHtml(artworkUrl)}" alt="Pochette — ${escapeHtml(label)}" class="${className}" loading="lazy" decoding="async" width="${dimension}" height="${dimension}" />`;
}

function getStreamingLinks(proposal: PropalProposalView): {
  spotifyUrl: string;
  deezerUrl: string;
  youtubeUrl: string;
} {
  const fallbackQuery = encodeURIComponent([proposal.title, proposal.artist].filter(Boolean).join(" "));

  return {
    spotifyUrl: proposal.spotifyUrl ?? `https://open.spotify.com/search/${fallbackQuery}`,
    deezerUrl: proposal.deezerUrl ?? `https://www.deezer.com/search/${fallbackQuery}`,
    youtubeUrl: proposal.youtubeUrl ?? `https://www.youtube.com/results?search_query=${fallbackQuery}`,
  };
}

function renderStreamingLinks(proposal: PropalProposalView): string {
  const links = getStreamingLinks(proposal);

  return `
    <div class="propal-streaming-links">
      <a
        href="${escapeHtml(links.spotifyUrl)}"
        class="propal-streaming-link propal-streaming-link--spotify"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Écouter sur Spotify"
      >
        ${ICON_SPOTIFY}
      </a>
      <a
        href="${escapeHtml(links.deezerUrl)}"
        class="propal-streaming-link propal-streaming-link--deezer"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Écouter sur Deezer"
      >
        ${ICON_DEEZER}
      </a>
      <a
        href="${escapeHtml(links.youtubeUrl)}"
        class="propal-streaming-link propal-streaming-link--youtube"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Écouter sur YouTube"
      >
        ${ICON_YOUTUBE}
      </a>
    </div>
  `;
}

function getMemberRating(proposal: PropalProposalView, memberId: string | null): number | null {
  if (!memberId) return null;
  return proposal.ratings.find((rating) => rating.memberId === memberId)?.score ?? null;
}

function hasMemberRated(proposal: PropalProposalView, memberId: string | null): boolean {
  return getMemberRating(proposal, memberId) !== null;
}

function formatAverage(value: number): string {
  if (value === 0) return "—";
  return value.toFixed(1);
}

function countMemberRatings(proposals: PropalProposalView[], memberId: string | null): number {
  if (!memberId) return 0;
  return proposals.filter((proposal) => hasMemberRated(proposal, memberId)).length;
}

function getPendingProposals(
  proposals: PropalProposalView[],
  memberId: string | null,
): PropalProposalView[] {
  if (!memberId) return [];
  return proposals.filter((proposal) => !hasMemberRated(proposal, memberId));
}

function countPendingProposals(proposals: PropalProposalView[], memberId: string | null): number {
  return getPendingProposals(proposals, memberId).length;
}

function filterProposals(
  proposals: PropalProposalView[],
  memberId: string | null,
  listFilter: ListFilter,
): RankedProposal[] {
  return withRanks(proposals).filter(({ proposal }) => {
    if (listFilter === "rated" && (!memberId || !hasMemberRated(proposal, memberId))) {
      return false;
    }

    if (listFilter === "mine" && (!memberId || proposal.proposedBy !== memberId)) {
      return false;
    }

    return true;
  });
}

function countMemberProposals(proposals: PropalProposalView[], memberId: string | null): number {
  if (!memberId) return 0;
  return proposals.filter((proposal) => proposal.proposedBy === memberId).length;
}

function renderMemberPicker(members: PropalMember[], selectedId: string | null): string {
  if (members.length === 0) {
    return `<p class="text-sm text-text-muted sm:col-span-2">Aucun compte membre configuré.</p>`;
  }

  return members
    .map((member) => {
      const selected = member.id === selectedId;
      return `
        <button
          type="button"
          class="propal-member-card ${selected ? "propal-member-card--selected" : ""}"
          data-member-pick="${member.id}"
          role="option"
          aria-selected="${selected}"
        >
          <span class="propal-member-card__avatar">${escapeHtml(memberInitial(member.label))}</span>
          <span class="font-medium text-text">${escapeHtml(member.label)}</span>
        </button>
      `;
    })
    .join("");
}

function renderMemberAdminList(members: PropalMember[], editingId: string | null): string {
  if (members.length === 0) {
    return `<li class="text-sm text-text-muted">Aucun membre.</li>`;
  }

  return members
    .map((member) => {
      if (editingId === member.id) {
        return `
          <li class="propal-member-admin__row propal-member-admin__row--edit">
            <span class="propal-member-admin__chip-avatar" aria-hidden="true">${escapeHtml(memberInitial(member.label))}</span>
            <input
              class="input-field propal-member-admin__edit-input"
              type="text"
              value="${escapeHtml(member.label)}"
              minlength="2"
              maxlength="40"
              data-member-edit-label="${member.id}"
            />
            <div class="propal-member-admin__row-actions">
              <button type="button" class="btn-primary px-3 py-1.5 text-sm" data-member-edit-save="${member.id}">OK</button>
              <button type="button" class="btn-secondary px-3 py-1.5 text-sm" data-member-edit-cancel>Annuler</button>
            </div>
          </li>
        `;
      }

      return `
        <li class="propal-member-admin__row">
          <span class="propal-member-admin__chip-avatar" aria-hidden="true">${escapeHtml(memberInitial(member.label))}</span>
          <span class="propal-member-admin__row-label">${escapeHtml(member.label)}</span>
          <div class="propal-member-admin__row-actions">
            <button type="button" class="propal-member-admin__edit-btn" data-member-edit="${member.id}">Modifier</button>
            <button type="button" class="propal-member-admin__delete-btn" data-member-delete="${member.id}" aria-label="Supprimer ${escapeHtml(member.label)}">${ICON_DELETE}</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function slugifyMemberLabel(label: string): string {
  return label
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function renderRatingChips(
  proposal: PropalProposalView,
  memberId: string | null,
): string {
  if (proposal.ratings.length === 0) {
    return `<span class="text-xs text-text-muted">Aucune note pour l'instant</span>`;
  }

  return proposal.ratings
    .map((rating) => {
      const isMe = rating.memberId === memberId;
      return `<span class="propal-rating-chip ${isMe ? "propal-rating-chip--me" : ""}">${escapeHtml(rating.label)} · ${rating.score}/5</span>`;
    })
    .join("");
}

function renderStarRating(proposal: PropalProposalView, memberId: string | null): string {
  const myRating = getMemberRating(proposal, memberId);
  const stars = [1, 2, 3, 4, 5]
    .map(
      (value) => `
        <button
          type="button"
          class="propal-rating__star ${myRating !== null && myRating >= value ? "propal-rating__star--active" : ""}"
          data-rate="${value}"
          data-proposal-id="${proposal.id}"
          aria-label="Noter ${value} sur 5"
          ${!memberId ? "disabled" : ""}
        >
          <span aria-hidden="true">★</span>
        </button>
      `,
    )
    .join("");

  return `
    <div class="propal-rating propal-rating--compact">
      <div class="propal-rating__row">
        <p class="propal-rating__label">Votre note</p>
        <div class="propal-rating__stars" role="group" aria-label="Noter ce titre sur 5">
          ${stars}
        </div>
      </div>
      ${
        myRating
          ? `
        <button
          type="button"
          class="propal-rating__clear"
          data-rating-remove
          data-proposal-id="${proposal.id}"
        >
          Retirer
        </button>
      `
          : ""
      }
    </div>
  `;
}

function renderPendingCard(proposal: PropalProposalView, memberId: string | null): string {
  return `
    <article
      class="propal-pending-card"
      data-proposal-id="${proposal.id}"
      id="propal-pending-${proposal.id}"
    >
      <div class="propal-pending-card__main">
        ${renderArtwork(proposal.artworkUrl, `${proposal.title} — ${proposal.artist}`, "md")}
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold leading-snug text-text">${escapeHtml(proposal.title)}</h3>
          ${
            proposal.artist
              ? `<p class="mt-0.5 text-xs text-text-muted">${escapeHtml(proposal.artist)}</p>`
              : ""
          }
          <p class="mt-1 text-xs text-text-muted">
            Proposé par ${escapeHtml(proposal.proposedByLabel)}
          </p>
          ${renderStreamingLinks(proposal)}
        </div>
      </div>
      ${renderStarRating(proposal, memberId)}
    </article>
  `;
}

function renderPendingList(
  proposals: PropalProposalView[],
  memberId: string | null,
): string {
  if (!memberId) {
    return `<p class="text-sm text-text-muted">Connectez-vous pour voir les titres à noter.</p>`;
  }

  const pending = getPendingProposals(proposals, memberId);
  if (pending.length === 0) {
    return `
      <div class="rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
        <p class="font-medium text-text">Tout est noté</p>
        <p class="mt-2 text-sm text-text-muted">Vous avez noté tous les titres. Consultez le classement.</p>
      </div>
    `;
  }

  return `
    <div class="propal-pending-list space-y-2">
      ${pending.map((proposal) => renderPendingCard(proposal, memberId)).join("")}
    </div>
  `;
}

function renderProposals(
  items: RankedProposal[],
  memberId: string | null,
  options: { totalCount: number },
): string {
  if (options.totalCount === 0) {
    return `
      <div class="rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
        <p class="font-medium text-text">Aucune proposition</p>
        <p class="mt-2 text-sm text-text-muted">Passez à l'onglet Proposer pour ajouter un titre.</p>
      </div>
    `;
  }

  if (items.length === 0) {
    return `
      <div class="rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
        <p class="font-medium text-text">Aucun résultat</p>
        <p class="mt-2 text-sm text-text-muted">Essayez un autre filtre.</p>
      </div>
    `;
  }

  return items
    .map(({ proposal, rank }) => {
      const myRating = getMemberRating(proposal, memberId);
      const isProposer = memberId ? proposal.proposedBy === memberId : false;
      const isTop = rank !== null && rank <= 3;

      return `
        <article
          class="propal-vote-card ${myRating ? "propal-vote-card--mine" : ""}"
          data-proposal-id="${proposal.id}"
          id="propal-item-${proposal.id}"
        >
          <div class="propal-vote-card__mobile-meta">
            ${
              rank !== null
                ? `<span class="propal-vote-card__rank ${isTop ? "propal-vote-card__rank--top" : ""}">${rank}</span>`
                : `<span class="propal-vote-card__rank propal-vote-card__rank--empty" aria-hidden="true"></span>`
            }
            <span class="propal-rating-average propal-rating-average--inline">${formatAverage(proposal.averageRating)}<span class="text-sm font-normal text-text-muted">/5</span></span>
            <span class="propal-vote-card__meta-notes">${proposal.ratingCount} note${proposal.ratingCount > 1 ? "s" : ""}</span>
          </div>

          <div class="propal-vote-card__layout">
            <aside class="propal-vote-card__aside" aria-hidden="true">
              ${
                rank !== null
                  ? `<span class="propal-vote-card__rank ${isTop ? "propal-vote-card__rank--top" : ""}">${rank}</span>`
                  : `<span class="propal-vote-card__rank propal-vote-card__rank--empty" aria-hidden="true"></span>`
              }
              <span class="propal-rating-average mt-2">${formatAverage(proposal.averageRating)}</span>
              <span class="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted">/5</span>
              <span class="mt-1 text-[10px] text-text-muted">${proposal.ratingCount} note${proposal.ratingCount > 1 ? "s" : ""}</span>
            </aside>

            <div class="propal-vote-card__content">
              <div class="propal-vote-card__info">
                ${renderArtwork(proposal.artworkUrl, `${proposal.title} — ${proposal.artist}`, "md")}
                <div class="propal-vote-card__text min-w-0 flex-1">
                  <h3 class="text-base font-semibold leading-snug text-text sm:text-lg">${escapeHtml(proposal.title)}</h3>
                  ${
                    proposal.artist
                      ? `<p class="mt-1 text-sm text-text-muted">${escapeHtml(proposal.artist)}</p>`
                      : ""
                  }
                  <p class="mt-1.5 text-xs text-text-muted">
                    Proposé par <span class="text-text">${escapeHtml(proposal.proposedByLabel)}</span>
                    · ${formatDate(proposal.createdAt)}
                  </p>
                  ${renderStreamingLinks(proposal)}
                  <div class="mt-1.5 flex flex-wrap gap-1">
                    ${renderRatingChips(proposal, memberId)}
                  </div>
                </div>
              </div>

              <div class="propal-vote-card__actions">
                ${renderStarRating(proposal, memberId)}
                ${
                  isProposer
                    ? `
                  <button
                    type="button"
                    class="propal-vote-card__delete-btn"
                    data-proposal-delete
                    data-proposal-id="${proposal.id}"
                  >
                    ${ICON_DELETE}
                    <span class="sm:hidden">Supprimer</span>
                    <span class="hidden sm:inline">Supprimer ma proposition</span>
                  </button>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateRatingSummary(
  el: HTMLElement | null,
  proposals: PropalProposalView[],
  memberId: string | null,
): void {
  if (!el) return;

  const count = proposals.length;
  const ratedCount = countMemberRatings(proposals, memberId);

  if (!count) {
    el.textContent = "Aucune proposition pour l'instant";
    return;
  }

  el.textContent =
    ratedCount > 0
      ? `${count} titre${count > 1 ? "s" : ""} · vous avez noté ${ratedCount} titre${ratedCount > 1 ? "s" : ""}`
      : `${count} titre${count > 1 ? "s" : ""} · notez chaque titre de 1 à 5`;
}

function updateListFilterSummary(
  el: HTMLElement | null,
  items: RankedProposal[],
  totalCount: number,
  listFilter: ListFilter,
): void {
  if (!el) return;

  const hasActiveFilter = listFilter !== "all";
  if (!hasActiveFilter || totalCount === 0) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }

  el.classList.remove("hidden");
  el.textContent =
    items.length === totalCount
      ? `${totalCount} titre${totalCount > 1 ? "s" : ""}`
      : `${items.length} sur ${totalCount} titre${totalCount > 1 ? "s" : ""} affiché${items.length > 1 ? "s" : ""}`;
}

async function fetchSongSearch(query: string): Promise<SongSearchResult[]> {
  const response = await fetch(`${apiUrl("/api/propal/search")}?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Recherche impossible");
  }

  const data = (await response.json()) as { results: SongSearchResult[] };
  return data.results ?? [];
}

function renderSongSearchResults(results: SongSearchResult[]): string {
  if (results.length === 0) {
    return `<p class="propal-search-results__empty">Aucun résultat. Saisissez le titre manuellement.</p>`;
  }

  return results
    .map(
      (result, index) => `
        <button
          type="button"
          class="propal-search-results__item"
          data-song-pick="${index}"
          role="option"
          id="propal-search-option-${index}"
        >
          ${renderArtwork(result.artworkUrl, result.title, "sm")}
          <span class="propal-search-results__body">
            <span class="propal-search-results__title">${escapeHtml(result.title)}</span>
            <span class="propal-search-results__meta">
              ${escapeHtml(result.artist)}${result.album ? ` · ${escapeHtml(result.album)}` : ""}
            </span>
          </span>
        </button>
      `,
    )
    .join("");
}

function initSongSearch(
  root: HTMLElement,
  searchInput: HTMLInputElement | null,
  searchResults: HTMLElement | null,
  onPick: (result: SongSearchResult) => void,
): () => void {
  let debounceTimer: number | undefined;
  let lastResults: SongSearchResult[] = [];

  function hideResults(): void {
    searchResults?.classList.add("hidden");
    if (searchResults) searchResults.innerHTML = "";
  }

  function clearSearch(): void {
    if (searchInput) searchInput.value = "";
    lastResults = [];
    hideResults();
  }

  async function runSearch(query: string): Promise<void> {
    if (searchResults) {
      searchResults.innerHTML = `<p class="propal-search-results__empty">Recherche…</p>`;
      searchResults.classList.remove("hidden");
    }

    try {
      lastResults = await fetchSongSearch(query);
      if (searchResults) {
        searchResults.innerHTML = renderSongSearchResults(lastResults);
        searchResults.classList.remove("hidden");
      }
    } catch {
      lastResults = [];
      if (searchResults) {
        searchResults.innerHTML = `<p class="propal-search-results__empty">Recherche indisponible.</p>`;
        searchResults.classList.remove("hidden");
      }
    }
  }

  searchInput?.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    const query = searchInput.value.trim();

    if (query.length < 2) {
      hideResults();
      return;
    }

    debounceTimer = window.setTimeout(() => {
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  });

  searchInput?.addEventListener("focus", () => {
    if (searchResults?.innerHTML && searchInput.value.trim().length >= 2) {
      searchResults.classList.remove("hidden");
    }
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const pickBtn = target.closest<HTMLButtonElement>("[data-song-pick]");
    if (pickBtn) {
      const index = Number(pickBtn.dataset.songPick);
      const result = lastResults[index];
      if (result) {
        onPick(result);
      }
      clearSearch();
      return;
    }

    if (!target.closest("[data-song-search]")) {
      hideResults();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideResults();
  });

  return clearSearch;
}

async function fetchProposals(): Promise<PropalListResponse> {
  const response = await fetch(apiUrl("/api/propal"));
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Chargement impossible");
  }
  return response.json() as Promise<PropalListResponse>;
}

function initPropalPage(): void {
  const root = document.querySelector<HTMLElement>("[data-propal-app]");
  if (!root) return;

  const page = root.closest<HTMLElement>(".propal-page");
  const memberStep = root.querySelector<HTMLElement>("[data-member-step]");
  const memberSelect = root.querySelector<HTMLElement>("[data-member-select]");
  const memberPicker = root.querySelector<HTMLElement>("[data-member-picker]");
  const memberAvatar = page?.querySelector<HTMLElement>("[data-member-avatar]");
  const memberChange = page?.querySelector<HTMLButtonElement>("[data-member-change]");
  const proposalForm = root.querySelector<HTMLFormElement>("[data-proposal-form]");
  const proposalTitle = root.querySelector<HTMLInputElement>("[data-proposal-title]");
  const proposalArtist = root.querySelector<HTMLInputElement>("[data-proposal-artist]");
  const proposalArtwork = root.querySelector<HTMLInputElement>("[data-proposal-artwork]");
  const proposalPreviewArtwork = root.querySelector<HTMLElement>("[data-proposal-preview-artwork]");
  const proposalPreviewTitle = root.querySelector<HTMLElement>("[data-proposal-preview-title]");
  const proposalPreviewArtist = root.querySelector<HTMLElement>("[data-proposal-preview-artist]");
  const proposalPreviewAlbum = root.querySelector<HTMLElement>("[data-proposal-preview-album]");
  const proposalClear = root.querySelector<HTMLButtonElement>("[data-proposal-clear]");
  const proposalManualForm = root.querySelector<HTMLFormElement>("[data-proposal-manual-form]");
  const proposalManualTitle = root.querySelector<HTMLInputElement>("[data-proposal-manual-title]");
  const proposalManualArtist = root.querySelector<HTMLInputElement>("[data-proposal-manual-artist]");
  const songSearchInput = root.querySelector<HTMLInputElement>("[data-song-search-input]");
  const songSearchResults = root.querySelector<HTMLElement>("[data-song-search-results]");
  const proposalSubmit = root.querySelector<HTMLButtonElement>("[data-proposal-submit]");
  const proposalList = root.querySelector<HTMLElement>("[data-proposal-list]");
  const pendingList = root.querySelector<HTMLElement>("[data-pending-list]");
  const pendingSummary = root.querySelector<HTMLElement>("[data-pending-summary]");
  const propalContent = root.querySelector<HTMLElement>("[data-propal-content]");
  const voteSummary = root.querySelector<HTMLElement>("[data-vote-summary]");
  const listFilterSummary = root.querySelector<HTMLElement>("[data-list-filter-summary]");
  const rankingCount = root.querySelector<HTMLElement>("[data-ranking-count]");
  const pendingCountEl = root.querySelector<HTMLElement>("[data-pending-count]");
  const viewPending = root.querySelector<HTMLElement>("[data-propal-view-pending]");
  const viewRanking = root.querySelector<HTMLElement>("[data-propal-view-ranking]");
  const viewPropose = root.querySelector<HTMLElement>("[data-propal-view-propose]");
  const viewTabs = root.querySelectorAll<HTMLButtonElement>("[data-propal-view]");
  const pendingTab = root.querySelector<HTMLButtonElement>('[data-propal-view="pending"]');
  const filterChips = root.querySelectorAll<HTMLButtonElement>("[data-list-filter]");
  const statusEl = root.querySelector<HTMLElement>("[data-propal-status]");
  const errorEl = root.querySelector<HTMLElement>("[data-propal-error]");
  const memberAdminAccess = root.querySelector<HTMLElement>("[data-member-admin-access]");
  const memberAdminPanel = root.querySelector<HTMLElement>("[data-member-admin-panel]");
  const memberAdminList = root.querySelector<HTMLElement>("[data-member-admin-list]");
  const memberAdminToggle = root.querySelector<HTMLButtonElement>("[data-member-admin-toggle]");
  const memberAdminAuthForm = root.querySelector<HTMLFormElement>("[data-member-admin-auth]");
  const memberAdminPassword = root.querySelector<HTMLInputElement>("[data-member-admin-password]");
  const memberAdminAuthSubmit = root.querySelector<HTMLButtonElement>("[data-member-admin-auth-submit]");
  const memberAdminAuthCancel = root.querySelector<HTMLButtonElement>("[data-member-admin-auth-cancel]");
  const memberAddToggle = root.querySelector<HTMLButtonElement>("[data-member-add-toggle]");
  const memberAddForm = root.querySelector<HTMLFormElement>("[data-member-add-form]");
  const memberAddLabel = root.querySelector<HTMLInputElement>("[data-member-add-label]");
  const memberAddId = root.querySelector<HTMLInputElement>("[data-member-add-id]");
  const memberAddSubmit = root.querySelector<HTMLButtonElement>("[data-member-add-submit]");
  const memberAddCancel = root.querySelector<HTMLButtonElement>("[data-member-add-cancel]");

  let memberId = getStoredMemberId();
  let members: PropalMember[] = [];
  let proposals: PropalProposalView[] = [];
  let selectedSong: SongSearchResult | null = null;
  let activeView: PropalView = "ranking";
  let listFilter: ListFilter = "all";
  let adminPanelOpen = false;
  let editingMemberId: string | null = null;
  let accountSwitcherOpen = false;
  let adminAuthenticated = false;
  let adminPassword: string | null = null;

  function getDefaultView(): PropalView {
    if (memberId && countPendingProposals(proposals, memberId) > 0) {
      return "pending";
    }

    return "ranking";
  }

  function setActiveView(view: PropalView): void {
    activeView = view;

    viewTabs.forEach((tab) => {
      const isActive = tab.dataset.propalView === view;
      tab.classList.toggle("propal-view-tab--active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    viewPending?.classList.toggle("hidden", view !== "pending");
    viewRanking?.classList.toggle("hidden", view !== "ranking");
    viewPropose?.classList.toggle("hidden", view !== "propose");
  }

  function updateViewTabUi(): void {
    const pendingCount = countPendingProposals(proposals, memberId);

    if (pendingCountEl) {
      pendingCountEl.textContent = String(pendingCount);
      pendingCountEl.classList.toggle("hidden", pendingCount === 0);
    }

    pendingTab?.classList.toggle("propal-view-tab--attention", pendingCount > 0);

    if (rankingCount) {
      rankingCount.textContent = String(proposals.length);
    }
  }

  function updatePendingSummary(): void {
    if (!pendingSummary) return;

    const pendingCount = countPendingProposals(proposals, memberId);
    if (!memberId) {
      pendingSummary.textContent = "";
      pendingSummary.classList.add("hidden");
      return;
    }

    pendingSummary.classList.remove("hidden");
    pendingSummary.textContent =
      pendingCount === 0
        ? "Aucun titre en attente"
        : `${pendingCount} titre${pendingCount > 1 ? "s" : ""} en attente de votre note`;
  }

  function updateFilterUi(): void {
    const mineCount = countMemberProposals(proposals, memberId);
    const ratedCount = countMemberRatings(proposals, memberId);

    filterChips.forEach((chip) => {
      const filter = chip.dataset.listFilter as ListFilter | undefined;
      if (!filter) return;

      chip.classList.toggle("propal-filter-chip--active", filter === listFilter);

      if (filter === "rated") {
        chip.disabled = ratedCount === 0;
        chip.textContent = ratedCount > 0 ? `Mes notes (${ratedCount})` : "Mes notes";
      }

      if (filter === "mine") {
        chip.disabled = mineCount === 0;
        chip.textContent = mineCount > 0 ? `Mes titres (${mineCount})` : "Mes titres";
      }

      if (filter === "all") {
        chip.textContent = proposals.length > 0 ? `Tous (${proposals.length})` : "Tous";
      }
    });
  }

  function renderPendingView(): void {
    if (!pendingList) return;

    pendingList.innerHTML = renderPendingList(proposals, memberId);
    updatePendingSummary();
    updateViewTabUi();
  }

  function renderProposalList(): void {
    if (!proposalList) return;

    const filtered = filterProposals(proposals, memberId, listFilter);

    proposalList.innerHTML = renderProposals(filtered, memberId, {
      totalCount: proposals.length,
    });

    updateRatingSummary(voteSummary, proposals, memberId);
    updateListFilterSummary(listFilterSummary, filtered, proposals.length, listFilter);
    updateFilterUi();
    renderPendingView();
  }

  function showProposalPreview(result: SongSearchResult): void {
    selectedSong = result;

    if (proposalTitle) proposalTitle.value = result.title;
    if (proposalArtist) proposalArtist.value = result.artist;
    if (proposalArtwork) proposalArtwork.value = result.artworkUrl ?? "";

    if (proposalPreviewArtwork) {
      proposalPreviewArtwork.innerHTML = renderArtwork(
        result.artworkUrl,
        `${result.title} — ${result.artist}`,
        "md",
      );
    }
    if (proposalPreviewTitle) proposalPreviewTitle.textContent = result.title;
    if (proposalPreviewArtist) proposalPreviewArtist.textContent = result.artist;
    if (proposalPreviewAlbum) {
      proposalPreviewAlbum.textContent = result.album ? `Album · ${result.album}` : "";
      proposalPreviewAlbum.classList.toggle("hidden", !result.album);
    }

    proposalForm?.classList.remove("hidden");
    songSearchInput?.blur();
  }

  function clearProposalPreview(): void {
    selectedSong = null;
    proposalForm?.classList.add("hidden");
    proposalForm?.reset();
    if (proposalArtwork) proposalArtwork.value = "";
    clearSongSearch();
    songSearchInput?.focus();
  }

  const clearSongSearch = initSongSearch(root, songSearchInput, songSearchResults, showProposalPreview);

  function setStatus(message: string): void {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("hidden", !message);
  }

  function setError(message: string): void {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.toggle("hidden", !message);
  }

  function setMemberAddFormOpen(open: boolean): void {
    memberAddForm?.classList.toggle("hidden", !open);
    memberAddToggle?.setAttribute("aria-expanded", String(open));
    memberAddToggle?.classList.toggle("hidden", open);

    if (!open) {
      memberAddForm?.reset();
      if (memberAddId) memberAddId.dataset.autofill = "";
    } else {
      editingMemberId = null;
      if (memberAdminList) {
        memberAdminList.innerHTML = renderMemberAdminList(members, editingMemberId);
      }
      memberAddLabel?.focus();
    }
  }

  function clearAdminAuth(): void {
    adminAuthenticated = false;
    adminPassword = null;
    memberAdminAuthForm?.reset();
    setAdminAuthFormOpen(false);
  }

  function setAdminAuthFormOpen(open: boolean): void {
    memberAdminAuthForm?.classList.toggle("hidden", !open);
    memberAdminToggle?.classList.toggle("hidden", open);
  }

  function setAdminPanelOpen(open: boolean): void {
    adminPanelOpen = open;
    memberAdminPanel?.classList.toggle("hidden", !open);
    memberAdminToggle?.setAttribute("aria-expanded", String(open));

    if (!open) {
      setMemberAddFormOpen(false);
      editingMemberId = null;
    }
  }

  async function authenticateAdmin(password: string): Promise<boolean> {
    const response = await fetch(apiUrl("/api/propal/members/auth"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Mot de passe incorrect");
    }

    adminAuthenticated = true;
    adminPassword = password;
    return true;
  }

  function updateMemberAdminUi(): void {
    const showAdminAccess = accountSwitcherOpen && Boolean(memberId);

    memberAdminAccess?.classList.toggle("hidden", !showAdminAccess);

    if (!showAdminAccess) {
      clearAdminAuth();
      setAdminPanelOpen(false);
      return;
    }

    if (!adminAuthenticated) {
      setAdminPanelOpen(false);
      return;
    }

    if (memberAdminList) {
      memberAdminList.innerHTML = renderMemberAdminList(members, editingMemberId);
    }

    memberAdminPanel?.classList.toggle("hidden", !adminPanelOpen);
    memberAdminToggle?.setAttribute("aria-expanded", String(adminPanelOpen));
  }

  function updateMemberUi(): void {
    const hasMember = Boolean(memberId);
    const member = members.find((item) => item.id === memberId);
    const showMemberStep = !hasMember || accountSwitcherOpen;

    memberStep?.classList.toggle("hidden", !showMemberStep);
    memberSelect?.classList.toggle("hidden", hasMember && !accountSwitcherOpen);
    propalContent?.classList.toggle("hidden", !hasMember || accountSwitcherOpen);
    memberChange?.classList.toggle("hidden", !hasMember);

    if (memberPicker) {
      memberPicker.innerHTML = renderMemberPicker(members, memberId);
    }

    if (hasMember && member) {
      if (memberAvatar) memberAvatar.textContent = memberInitial(member.label);
      memberChange?.setAttribute(
        "aria-label",
        accountSwitcherOpen ? "Fermer le choix de compte" : `${member.label} — Changer de compte`,
      );
      memberChange?.classList.toggle("propal-member-nav--active", accountSwitcherOpen);
    }

    proposalSubmit?.toggleAttribute("disabled", !hasMember);
    updateMemberAdminUi();
  }

  function openAccountSwitcher(): void {
    accountSwitcherOpen = true;
    setAdminPanelOpen(false);
    editingMemberId = null;
    updateMemberUi();
    memberStep?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeAccountSwitcher(): void {
    accountSwitcherOpen = false;
    clearAdminAuth();
    setAdminPanelOpen(false);
    editingMemberId = null;
    updateMemberUi();
  }

  async function refreshMembers(membersList: PropalMember[]): Promise<void> {
    members = membersList;
    updateMemberUi();
    if (memberId) {
      await loadProposals();
    }
  }

  async function submitNewMember(): Promise<void> {
    if (!adminPassword || !memberAddLabel) return;

    const label = memberAddLabel.value.trim();
    const idInput = memberAddId?.value.trim().toLowerCase() ?? "";
    const id = idInput || slugifyMemberLabel(label);

    if (label.length < 2) {
      setError("Le prénom doit contenir au moins 2 caractères.");
      return;
    }

    setError("");
    memberAddSubmit?.setAttribute("disabled", "true");

    try {
      const response = await fetch(apiUrl("/api/propal/members"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword,
          label,
          id: idInput ? id : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 403) clearAdminAuth();
        throw new Error(payload?.error ?? "Impossible d'ajouter le membre");
      }

      const data = (await response.json()) as { members: PropalMember[] };
      await refreshMembers(data.members);
      setMemberAddFormOpen(false);
      setStatus(`${label} a été ajouté(e).`);
      window.setTimeout(() => setStatus(""), 2500);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      memberAddSubmit?.removeAttribute("disabled");
    }
  }

  async function submitMemberUpdate(targetId: string, label: string): Promise<void> {
    if (!adminPassword) return;

    if (label.length < 2) {
      setError("Le prénom doit contenir au moins 2 caractères.");
      return;
    }

    setError("");

    try {
      const response = await fetch(apiUrl("/api/propal/members"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword, targetId, label }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 403) clearAdminAuth();
        throw new Error(payload?.error ?? "Impossible de modifier le membre");
      }

      const data = (await response.json()) as { members: PropalMember[] };
      editingMemberId = null;
      await refreshMembers(data.members);
      setStatus("Membre mis à jour.");
      window.setTimeout(() => setStatus(""), 2500);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    }
  }

  async function submitMemberDelete(targetId: string, label: string): Promise<void> {
    if (!adminPassword) {
      setError("Session admin expirée. Reconnectez-vous.");
      return;
    }

    if (
      !window.confirm(
        `Supprimer ${label} ? Ses propositions et ses notes seront également effacées.`,
      )
    ) {
      return;
    }

    setError("");

    try {
      const response = await fetch(apiUrl("/api/propal/members"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword, targetId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 403) clearAdminAuth();
        throw new Error(payload?.error ?? "Impossible de supprimer le membre");
      }

      const data = (await response.json()) as { members: PropalMember[] };

      if (memberId === targetId) {
        memberId = null;
        localStorage.removeItem(STORAGE_KEY);
      }

      editingMemberId = null;
      await refreshMembers(data.members);
      setStatus(`${label} a été supprimé(e).`);
      window.setTimeout(() => setStatus(""), 2500);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    }
  }

  async function submitProposal(payload: {
    title: string;
    artist: string;
    artworkUrl?: string;
  }): Promise<void> {
    if (!memberId) return;

    setError("");

    const response = await fetch(apiUrl("/api/propal/proposals"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        artist: payload.artist,
        memberId,
        artworkUrl: payload.artworkUrl || undefined,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Envoi impossible");
    }

    clearProposalPreview();
    proposalManualForm?.reset();
    await loadProposals();
    setActiveView("ranking");
    setStatus("Proposition ajoutée.");
    window.setTimeout(() => setStatus(""), 2500);
  }

  function render(data: PropalListResponse): void {
    members = data.members;
    proposals = data.proposals;

    renderProposalList();
    updateMemberUi();
  }

  async function selectMember(id: string): Promise<void> {
    if (!members.some((member) => member.id === id)) return;

    memberId = id;
    setStoredMemberId(id);
    accountSwitcherOpen = false;
    setError("");
    updateMemberUi();
    await loadProposals();
    setActiveView(getDefaultView());
    setStatus(`Bienvenue ${members.find((member) => member.id === id)?.label ?? ""} !`);
    window.setTimeout(() => setStatus(""), 2200);
  }

  async function loadProposals(): Promise<void> {
    setError("");
    if (proposalList) {
      proposalList.innerHTML = `<p class="py-8 text-center text-sm text-text-muted">Chargement…</p>`;
    }
    if (pendingList) {
      pendingList.innerHTML = `<p class="py-8 text-center text-sm text-text-muted">Chargement…</p>`;
    }

    try {
      const data = await fetchProposals();
      render(data);
    } catch (error) {
      if (proposalList) proposalList.innerHTML = "";
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    }
  }

  memberPicker?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const pickBtn = target.closest<HTMLButtonElement>("[data-member-pick]");
    const id = pickBtn?.dataset.memberPick;
    if (!id) return;

    void selectMember(id);
  });

  memberChange?.addEventListener("click", () => {
    if (accountSwitcherOpen) {
      closeAccountSwitcher();
    } else {
      openAccountSwitcher();
    }
    setStatus("");
    setError("");
  });

  memberAdminToggle?.addEventListener("click", () => {
    if (!adminAuthenticated) {
      setAdminAuthFormOpen(true);
      memberAdminPassword?.focus();
      return;
    }

    setAdminPanelOpen(!adminPanelOpen);
    updateMemberAdminUi();
  });

  memberAdminAuthForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!memberAdminPassword) return;

    setError("");
    memberAdminAuthSubmit?.setAttribute("disabled", "true");

    try {
      await authenticateAdmin(memberAdminPassword.value);
      setAdminAuthFormOpen(false);
      setAdminPanelOpen(true);
      updateMemberAdminUi();
      setStatus("Accès admin autorisé.");
      window.setTimeout(() => setStatus(""), 2200);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      memberAdminPassword.select();
    } finally {
      memberAdminAuthSubmit?.removeAttribute("disabled");
    }
  });

  memberAdminAuthCancel?.addEventListener("click", () => {
    setAdminAuthFormOpen(false);
    memberAdminAuthForm?.reset();
  });

  memberAddToggle?.addEventListener("click", () => {
    setMemberAddFormOpen(true);
  });

  memberAddCancel?.addEventListener("click", () => {
    setMemberAddFormOpen(false);
  });

  memberAdminList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const editBtn = target.closest<HTMLButtonElement>("[data-member-edit]");
    if (editBtn?.dataset.memberEdit) {
      editingMemberId = editBtn.dataset.memberEdit;
      setMemberAddFormOpen(false);
      updateMemberAdminUi();
      const input = memberAdminList.querySelector<HTMLInputElement>(
        `[data-member-edit-label="${editingMemberId}"]`,
      );
      input?.focus();
      input?.select();
      return;
    }

    const saveBtn = target.closest<HTMLButtonElement>("[data-member-edit-save]");
    if (saveBtn?.dataset.memberEditSave) {
      const input = memberAdminList.querySelector<HTMLInputElement>(
        `[data-member-edit-label="${saveBtn.dataset.memberEditSave}"]`,
      );
      if (!input) return;
      void submitMemberUpdate(saveBtn.dataset.memberEditSave, input.value.trim());
      return;
    }

    if (target.closest("[data-member-edit-cancel]")) {
      editingMemberId = null;
      updateMemberAdminUi();
      return;
    }

    const deleteBtn = target.closest<HTMLButtonElement>("[data-member-delete]");
    if (deleteBtn?.dataset.memberDelete) {
      const member = members.find((item) => item.id === deleteBtn.dataset.memberDelete);
      if (!member) return;
      void submitMemberDelete(member.id, member.label);
    }
  });

  memberAdminList?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    if (!event.target.matches("[data-member-edit-label]")) return;
    event.preventDefault();
    const targetId = event.target.dataset.memberEditLabel;
    if (!targetId) return;
    void submitMemberUpdate(targetId, event.target.value.trim());
  });

  memberAddLabel?.addEventListener("input", () => {
    if (!memberAddLabel || !memberAddId) return;
    if (memberAddId.value.trim() || memberAddId.dataset.autofill === "manual") return;
    memberAddId.value = slugifyMemberLabel(memberAddLabel.value);
  });

  memberAddId?.addEventListener("input", () => {
    if (!memberAddId) return;
    memberAddId.dataset.autofill = memberAddId.value.trim() ? "manual" : "";
  });

  memberAddForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitNewMember();
  });

  proposalClear?.addEventListener("click", () => {
    clearProposalPreview();
  });

  viewTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.propalView as PropalView | undefined;
      if (!view) return;
      setActiveView(view);
      if (view === "propose") {
        songSearchInput?.focus();
      }
    });
  });

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.listFilter as ListFilter | undefined;
      if (!filter || chip.disabled) return;
      listFilter = filter;
      renderProposalList();
    });
  });

  proposalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!memberId || !selectedSong) return;

    proposalSubmit?.setAttribute("disabled", "true");

    try {
      await submitProposal({
        title: selectedSong.title,
        artist: selectedSong.artist,
        artworkUrl: selectedSong.artworkUrl,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      proposalSubmit?.toggleAttribute("disabled", !memberId);
    }
  });

  proposalManualForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!memberId || !proposalManualTitle) return;

    const manualSubmit = root.querySelector<HTMLButtonElement>("[data-proposal-manual-submit]");
    manualSubmit?.setAttribute("disabled", "true");

    try {
      await submitProposal({
        title: proposalManualTitle.value,
        artist: proposalManualArtist?.value ?? "",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      manualSubmit?.toggleAttribute("disabled", !memberId);
    }
  });

  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const deleteBtn = target.closest<HTMLButtonElement>("[data-proposal-delete]");
    if (deleteBtn && memberId) {
      const proposalId = deleteBtn.dataset.proposalId;
      if (!proposalId) return;

      const proposal = proposals.find((item) => item.id === proposalId);
      const label = proposal?.title ?? "cette proposition";
      if (!window.confirm(`Supprimer « ${label} » et toutes les notes associées ?`)) return;

      setError("");
      deleteBtn.setAttribute("disabled", "true");

      try {
        const response = await fetch(apiUrl("/api/propal/proposals"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: proposalId, memberId }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Suppression impossible");
        }

        const data = (await response.json()) as PropalListResponse;
        render(data);
        setStatus("Proposition supprimée.");
        window.setTimeout(() => setStatus(""), 2200);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Erreur inconnue");
        deleteBtn.removeAttribute("disabled");
      }
      return;
    }

    const ratingRemoveBtn = target.closest<HTMLButtonElement>("[data-rating-remove]");
    if (ratingRemoveBtn && memberId) {
      const proposalId = ratingRemoveBtn.dataset.proposalId;
      if (!proposalId) return;

      setError("");
      ratingRemoveBtn.setAttribute("disabled", "true");

      try {
        const response = await fetch(apiUrl("/api/propal/vote"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalId,
            memberId,
            action: "remove",
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Impossible de retirer la note");
        }

        const data = (await response.json()) as PropalListResponse;
        render(data);
        setStatus("Note retirée.");
        window.setTimeout(() => setStatus(""), 2200);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Erreur inconnue");
        ratingRemoveBtn.removeAttribute("disabled");
      }
      return;
    }

    const rateBtn = target.closest<HTMLButtonElement>("[data-rate]");
    if (rateBtn && memberId) {
      const proposalId = rateBtn.dataset.proposalId;
      const rating = Number(rateBtn.dataset.rate);
      if (!proposalId || !rating) return;

      setError("");
      rateBtn.setAttribute("disabled", "true");

      try {
        const response = await fetch(apiUrl("/api/propal/vote"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalId,
            memberId,
            rating,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Impossible d'enregistrer la note");
        }

        const data = (await response.json()) as PropalListResponse;
        render(data);
        if (activeView === "pending" && countPendingProposals(data.proposals, memberId) === 0) {
          setActiveView("ranking");
        }
        setStatus(`Note enregistrée : ${rating}/5`);
        window.setTimeout(() => setStatus(""), 2200);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Erreur inconnue");
        rateBtn.removeAttribute("disabled");
      }
    }
  });

  fetchProposals()
    .then((data) => {
      members = data.members;

      if (memberId && !members.some((member) => member.id === memberId)) {
        memberId = null;
        localStorage.removeItem(STORAGE_KEY);
      }

      if (memberId) {
        render(data);
        setActiveView("ranking");
      } else {
        proposals = data.proposals;
        updateFilterUi();
        updateViewTabUi();
        updateMemberUi();
      }
    })
    .catch((error) => {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPropalPage);
} else {
  initPropalPage();
}
