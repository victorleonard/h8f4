import Sortable from "sortablejs";
import { computeSetlistGroups, summarizeSetlistDurations } from "../lib/setlist-groups";
import type {
  Setlist,
  SetlistItem,
  SetlistItemInput,
  SetlistListResponse,
  Song,
} from "../lib/setlist-types";
import { withBase } from "../utils/path";

const DEFAULT_PAUSE_SECONDS = 15 * 60;

type PickedSong = { kind: "song"; key: string; songId: string };
type PickedPause = { kind: "pause"; key: string; durationSeconds: number };
type PickedItem = PickedSong | PickedPause;

function newClientKey(): string {
  return crypto.randomUUID();
}

function itemsToPayload(items: PickedItem[]): SetlistItemInput[] {
  return items.map((item) =>
    item.kind === "pause"
      ? { kind: "pause", durationSeconds: item.durationSeconds }
      : { kind: "song", songId: item.songId },
  );
}

function serializeSetlistDraft(name: string, items: PickedItem[]): string {
  return JSON.stringify({
    name: name.trim(),
    items: itemsToPayload(items),
  });
}

function pickedToSetlistItems(items: PickedItem[], catalog: Song[]): SetlistItem[] {
  return items.map((item, position) => {
    if (item.kind === "pause") {
      return {
        kind: "pause",
        id: item.key,
        position,
        durationSeconds: item.durationSeconds,
      };
    }
    const song = catalog.find((entry) => entry.id === item.songId);
    return {
      kind: "song",
      id: item.key,
      position,
      songId: item.songId,
      title: song?.title ?? "Titre inconnu",
      artist: song?.artist ?? "",
      durationSeconds: song?.durationSeconds ?? 0,
      tempo: song?.tempo ?? 120,
      ...(song?.artworkUrl ? { artworkUrl: song.artworkUrl } : {}),
    };
  });
}

/** Durées agrégées (setlist) — format homogène, distinct du mm:ss des morceaux. */
function formatDurationSummary(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes > 0 && secs > 0) return `${minutes} min ${String(secs).padStart(2, "0")} s`;
  if (minutes > 0) return `${minutes} min`;
  return `${secs} s`;
}

function formatEstimateSummary(items: SetlistItem[]): string {
  const summary = summarizeSetlistDurations(items);
  const songCount = items.filter((item) => item.kind === "song").length;
  const hasPauses = summary.pauseDurationSeconds > 0;

  const parts: string[] = [];
  if (songCount > 0) {
    parts.push(`${songCount} titre${songCount > 1 ? "s" : ""}`);
  }
  parts.push(
    `Jeu&nbsp;: <strong class="text-text">${escapeHtml(formatDurationSummary(summary.estimatedDurationSeconds))}</strong>`,
  );
  if (hasPauses) {
    parts.push(
      `Pauses&nbsp;: <strong class="text-text">${escapeHtml(formatDurationSummary(summary.pauseDurationSeconds))}</strong>`,
    );
    parts.push(
      `Total&nbsp;: <strong class="text-text">${escapeHtml(formatDurationSummary(summary.estimatedTotalSeconds))}</strong>`,
    );
  }

  return `<div class="setlist-duration-stats"><span class="setlist-duration-stats__line">${parts.join(" · ")}</span></div>`;
}

const SEARCH_DEBOUNCE_MS = 350;

type SetlistView = "songs" | "setlists";
type PageMode = "list" | "detail";

interface SongSearchResult {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  durationSeconds?: number;
}

function apiUrl(path: string): string {
  return withBase(path);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const ICON_GRIP = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`;
const ICON_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="M9 21H3v-6"/><path d="m3 21 7-7"/></svg>`;
const ICON_PRINT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3h12v6"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>`;
const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16V4a2 2 0 0 1 2-2h10"/></svg>`;
const ICON_ARTWORK = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
const ICON_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

function renderArtwork(
  artworkUrl: string | undefined,
  label: string,
  size: "sm" | "md" = "sm",
): string {
  const className = size === "sm" ? "propal-artwork propal-artwork--sm" : "propal-artwork propal-artwork--md";
  const dimension = size === "sm" ? 64 : 80;
  if (!artworkUrl) {
    return `<span class="${className} propal-artwork--placeholder" aria-hidden="true">${ICON_ARTWORK}</span>`;
  }
  return `<img src="${escapeHtml(artworkUrl)}" alt="Pochette — ${escapeHtml(label)}" class="${className}" loading="lazy" decoding="async" width="${dimension}" height="${dimension}" />`;
}

async function fetchList(): Promise<SetlistListResponse> {
  const response = await fetch(apiUrl("/api/setlist"));
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Chargement impossible.");
  }
  return (await response.json()) as SetlistListResponse;
}

async function apiJson(
  path: string,
  method: string,
  body: Record<string, unknown>,
): Promise<SetlistListResponse & { error?: string; setlist?: Setlist }> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | (SetlistListResponse & { error?: string; setlist?: Setlist })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Action impossible.");
  }
  if (!payload) throw new Error("Réponse invalide.");
  return payload;
}

const TOAST_ICON_SUCCESS = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

let setlistToastHost: HTMLElement | null = null;
let setlistToastTimer: ReturnType<typeof setTimeout> | null = null;
let setlistToastEl: HTMLElement | null = null;

function ensureSetlistToastHost(aboveActions: boolean): HTMLElement {
  if (!setlistToastHost) {
    setlistToastHost = document.createElement("div");
    setlistToastHost.className = "setlist-toast-host";
    setlistToastHost.setAttribute("aria-live", "polite");
    document.body.appendChild(setlistToastHost);
  }
  setlistToastHost.classList.toggle("setlist-toast-host--above-actions", aboveActions);
  return setlistToastHost;
}

function showSetlistToast(message: string, aboveActions = false): void {
  const host = ensureSetlistToastHost(aboveActions);
  if (setlistToastTimer) {
    window.clearTimeout(setlistToastTimer);
    setlistToastTimer = null;
  }
  setlistToastEl?.remove();
  setlistToastEl = null;

  const toast = document.createElement("div");
  toast.className = "setlist-toast setlist-toast--success";
  toast.setAttribute("role", "status");
  toast.innerHTML = `<span class="setlist-toast__icon">${TOAST_ICON_SUCCESS}</span><span class="setlist-toast__text">${escapeHtml(message)}</span>`;
  host.appendChild(toast);
  setlistToastEl = toast;

  requestAnimationFrame(() => {
    toast.classList.add("setlist-toast--visible");
  });

  const dismiss = (): void => {
    toast.classList.remove("setlist-toast--visible");
    toast.classList.add("setlist-toast--exit");
    window.setTimeout(() => {
      toast.remove();
      if (setlistToastEl === toast) setlistToastEl = null;
    }, 280);
  };

  setlistToastTimer = window.setTimeout(() => {
    setlistToastTimer = null;
    dismiss();
  }, 3200);
}

function setupUi(root: HTMLElement): {
  showStatus: (message: string) => void;
  showError: (message: string) => void;
  clearMessages: () => void;
} {
  const statusEl = root.querySelector<HTMLElement>("[data-setlist-status]");
  const errorEl = root.querySelector<HTMLElement>("[data-setlist-error]");
  const aboveActions = root.dataset.setlistPage === "detail";

  function showStatus(message: string): void {
    if (errorEl) errorEl.classList.add("hidden");
    statusEl?.classList.add("hidden");
    showSetlistToast(message, aboveActions);
  }

  function showError(message: string): void {
    if (!statusEl || !errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    statusEl.classList.add("hidden");
  }

  function clearMessages(): void {
    statusEl?.classList.add("hidden");
    errorEl?.classList.add("hidden");
  }

  return { showStatus, showError, clearMessages };
}

/* ─── LIST PAGE ─────────────────────────────────────────── */

function initListPage(root: HTMLElement): void {
  const songsCountEl = root.querySelector<HTMLElement>("[data-songs-count]");
  const setlistsCountEl = root.querySelector<HTMLElement>("[data-setlists-count]");
  const songsSummaryEl = root.querySelector<HTMLElement>("[data-songs-summary]");
  const setlistsSummaryEl = root.querySelector<HTMLElement>("[data-setlists-summary]");
  const songsListEl = root.querySelector<HTMLElement>("[data-songs-list]");
  const setlistsListEl = root.querySelector<HTMLElement>("[data-setlists-list]");
  const songForm = root.querySelector<HTMLFormElement>("[data-song-form]");
  const songFormPanel = root.querySelector<HTMLElement>("[data-song-form-panel]");
  const songCreateBtn = root.querySelector<HTMLButtonElement>("[data-song-create]");
  const songFormTitle = root.querySelector<HTMLElement>("[data-song-form-title]");
  const songEditId = root.querySelector<HTMLInputElement>("[data-song-edit-id]");
  const songTitle = root.querySelector<HTMLInputElement>("[data-song-title]");
  const songArtist = root.querySelector<HTMLInputElement>("[data-song-artist]");
  const songMinutes = root.querySelector<HTMLInputElement>("[data-song-minutes]");
  const songSeconds = root.querySelector<HTMLInputElement>("[data-song-seconds]");
  const songTempo = root.querySelector<HTMLInputElement>("[data-song-tempo]");
  const songArtwork = root.querySelector<HTMLInputElement>("[data-song-artwork]");
  const songPreview = root.querySelector<HTMLElement>("[data-song-preview]");
  const songPreviewArtwork = root.querySelector<HTMLElement>("[data-song-preview-artwork]");
  const songPreviewTitle = root.querySelector<HTMLElement>("[data-song-preview-title]");
  const songPreviewMeta = root.querySelector<HTMLElement>("[data-song-preview-meta]");
  const songCancel = root.querySelector<HTMLButtonElement>("[data-song-cancel]");
  const songSearchInput = root.querySelector<HTMLInputElement>("[data-setlist-song-search-input]");
  const songSearchResults = root.querySelector<HTMLElement>("[data-setlist-song-search-results]");
  const setlistCreateBtn = root.querySelector<HTMLButtonElement>("[data-setlist-create]");
  const viewButtons = root.querySelectorAll<HTMLButtonElement>("[data-setlist-view]");
  const viewSongs = root.querySelector<HTMLElement>("[data-setlist-view-songs]");
  const viewSetlists = root.querySelector<HTMLElement>("[data-setlist-view-setlists]");

  if (!songsListEl || !setlistsListEl || !songForm || !songFormPanel || !songCreateBtn || !setlistCreateBtn || !viewSongs || !viewSetlists) {
    return;
  }

  let songs: Song[] = [];
  let setlists: Setlist[] = [];
  let currentView: SetlistView = "setlists";
  let songSearchTimer: number | undefined;
  let lastSongSearchResults: SongSearchResult[] = [];

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "songs") currentView = "songs";
  else currentView = "setlists";

  const ui = setupUi(root);

  void (async () => {
    try {
      const data = await fetchList();
      songs = data.songs;
      setlists = data.setlists;
      renderSongs();
      renderSetlists();
    } catch (error) {
      ui.showError(error instanceof Error ? error.message : "Chargement impossible.");
    }
  })();

  function setView(view: SetlistView): void {
    currentView = view;
    viewButtons.forEach((button) => {
      const active = button.dataset.setlistView === view;
      button.classList.toggle("propal-view-tab--active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    viewSongs.classList.toggle("hidden", view !== "songs");
    viewSetlists.classList.toggle("hidden", view !== "setlists");
    const url = new URL(window.location.href);
    if (view === "songs") url.searchParams.set("tab", "songs");
    else url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
  }

  function clearSongSearch(): void {
    if (songSearchInput) songSearchInput.value = "";
    if (songSearchResults) {
      songSearchResults.innerHTML = "";
      songSearchResults.classList.add("hidden");
    }
  }

  function updateSongPreview(title: string, artist: string, artworkUrl?: string): void {
    if (songArtwork) songArtwork.value = artworkUrl ?? "";
    if (!songPreview || !songPreviewArtwork || !songPreviewTitle || !songPreviewMeta) return;
    if (!title && !artworkUrl) {
      songPreview.classList.add("hidden");
      songPreview.classList.remove("flex");
      return;
    }
    songPreview.classList.remove("hidden");
    songPreview.classList.add("flex");
    songPreviewArtwork.innerHTML = renderArtwork(artworkUrl, title || "Titre", "sm");
    songPreviewTitle.textContent = title || "Sans titre";
    songPreviewMeta.textContent = artist || "Artiste inconnu";
  }

  function resetSongForm(): void {
    songForm.reset();
    if (songEditId) songEditId.value = "";
    if (songArtwork) songArtwork.value = "";
    updateSongPreview("", "");
    if (songFormTitle) songFormTitle.textContent = "Ajouter un titre";
    clearSongSearch();
    songFormPanel.classList.add("hidden");
    songCreateBtn.classList.remove("hidden");
  }

  function openCreateSongForm(): void {
    songForm.reset();
    if (songEditId) songEditId.value = "";
    if (songArtwork) songArtwork.value = "";
    updateSongPreview("", "");
    if (songFormTitle) songFormTitle.textContent = "Ajouter un titre";
    clearSongSearch();
    songFormPanel.classList.remove("hidden");
    songCreateBtn.classList.add("hidden");
    songSearchInput?.focus();
  }

  function fillSongForm(song: Song): void {
    if (songEditId) songEditId.value = song.id;
    if (songTitle) songTitle.value = song.title;
    if (songArtist) songArtist.value = song.artist;
    if (songMinutes) songMinutes.value = String(Math.floor(song.durationSeconds / 60));
    if (songSeconds) songSeconds.value = String(song.durationSeconds % 60);
    if (songTempo) songTempo.value = String(song.tempo);
    updateSongPreview(song.title, song.artist, song.artworkUrl);
    if (songFormTitle) songFormTitle.textContent = "Modifier le titre";
    clearSongSearch();
    songFormPanel.classList.remove("hidden");
    songCreateBtn.classList.add("hidden");
    songTitle?.focus();
  }

  function renderSongs(): void {
    if (songsCountEl) songsCountEl.textContent = String(songs.length);
    if (songsSummaryEl) {
      songsSummaryEl.textContent =
        songs.length === 0
          ? "Aucun titre enregistré."
          : `${songs.length} titre${songs.length > 1 ? "s" : ""} dans le répertoire`;
    }
    if (songs.length === 0) {
      songsListEl.innerHTML = `<p class="text-sm text-text-muted">Ajoutez votre premier titre.</p>`;
      return;
    }
    songsListEl.innerHTML = songs
      .map(
        (song) => `
        <article class="setlist-item" data-song-id="${escapeHtml(song.id)}">
          ${renderArtwork(song.artworkUrl, `${song.title} — ${song.artist || "Artiste"}`, "sm")}
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-text">${escapeHtml(song.title)}</p>
            <p class="mt-0.5 text-sm text-text-muted">${escapeHtml(song.artist || "Artiste inconnu")}</p>
            <p class="mt-1 text-xs text-text-muted">${formatDuration(song.durationSeconds)} · ${song.tempo} BPM</p>
          </div>
          <div class="setlist-item__actions">
            <button type="button" class="setlist-icon-btn" data-song-edit aria-label="Modifier">${ICON_EDIT}</button>
            <button type="button" class="setlist-icon-btn setlist-icon-btn--danger" data-song-delete aria-label="Supprimer">${ICON_DELETE}</button>
          </div>
        </article>
      `,
      )
      .join("");
  }

  function renderSetlists(): void {
    if (setlistsCountEl) setlistsCountEl.textContent = String(setlists.length);
    if (setlistsSummaryEl) {
      setlistsSummaryEl.textContent =
        setlists.length === 0
          ? "Aucune setlist pour l’instant."
          : `${setlists.length} setlist${setlists.length > 1 ? "s" : ""}`;
    }
    if (setlists.length === 0) {
      setlistsListEl.innerHTML = `<p class="text-sm text-text-muted">Créez une setlist pour préparer un concert.</p>`;
      return;
    }
    setlistsListEl.innerHTML = setlists
      .map(
        (setlist) => `
        <article class="setlist-card setlist-card--link" data-setlist-id="${escapeHtml(setlist.id)}">
          <a href="${escapeHtml(apiUrl(`/setlist/${setlist.id}/`))}" class="setlist-card__main">
            <div class="min-w-0 flex-1">
              <h3 class="font-display text-lg text-text">${escapeHtml(setlist.name)}</h3>
              <p class="mt-1 text-sm text-accent">
                ${formatDuration(setlist.estimatedDurationSeconds)}
                · ${setlist.songs.length} titre${setlist.songs.length > 1 ? "s" : ""}
                ${(setlist.pauseDurationSeconds ?? 0) > 0 ? ` · ${formatDuration(setlist.pauseDurationSeconds)} pause` : ""}
                ${(setlist.groups?.length ?? 0) > 1 ? ` · ${setlist.groups.length} sets` : ""}
              </p>
            </div>
            <span class="setlist-card__chevron text-text-muted" aria-hidden="true">${ICON_CHEVRON}</span>
          </a>
          <div class="setlist-item__actions shrink-0">
            <button type="button" class="setlist-icon-btn" data-setlist-duplicate aria-label="Dupliquer">${ICON_COPY}</button>
            <button type="button" class="setlist-icon-btn setlist-icon-btn--danger" data-setlist-delete aria-label="Supprimer">${ICON_DELETE}</button>
          </div>
        </article>
      `,
      )
      .join("");
  }

  setView(currentView);

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.setlistView as SetlistView | undefined;
      if (view) setView(view);
    });
  });

  songCreateBtn.addEventListener("click", () => openCreateSongForm());
  songCancel?.addEventListener("click", () => resetSongForm());

  songSearchInput?.addEventListener("input", () => {
    window.clearTimeout(songSearchTimer);
    const query = songSearchInput.value.trim();
    if (query.length < 2) {
      clearSongSearch();
      return;
    }
    songSearchTimer = window.setTimeout(() => {
      void (async () => {
        if (songSearchResults) {
          songSearchResults.innerHTML = `<p class="propal-search-results__empty">Recherche…</p>`;
          songSearchResults.classList.remove("hidden");
        }
        try {
          lastSongSearchResults = await (async () => {
            const response = await fetch(`${apiUrl("/api/propal/search")}?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error("fail");
            const data = (await response.json()) as { results: SongSearchResult[] };
            return data.results ?? [];
          })();
          if (songSearchResults) {
            songSearchResults.innerHTML =
              lastSongSearchResults.length === 0
                ? `<p class="propal-search-results__empty">Aucun résultat. Saisissez le titre manuellement.</p>`
                : lastSongSearchResults
                    .map((result, index) => {
                      const durationLabel =
                        typeof result.durationSeconds === "number"
                          ? ` · ${formatDuration(result.durationSeconds)}`
                          : "";
                      const art = result.artworkUrl
                        ? `<img src="${escapeHtml(result.artworkUrl)}" alt="" class="propal-artwork propal-artwork--sm" width="64" height="64" loading="lazy" />`
                        : `<span class="propal-artwork propal-artwork--sm propal-artwork--placeholder" aria-hidden="true">${ICON_ARTWORK}</span>`;
                      return `<button type="button" class="propal-search-results__item" data-setlist-song-pick="${index}" role="option">${art}<span class="propal-search-results__body"><span class="propal-search-results__title">${escapeHtml(result.title)}</span><span class="propal-search-results__meta">${escapeHtml(result.artist)}${result.album ? ` · ${escapeHtml(result.album)}` : ""}${durationLabel}</span></span></button>`;
                    })
                    .join("");
            songSearchResults.classList.remove("hidden");
          }
        } catch {
          if (songSearchResults) {
            songSearchResults.innerHTML = `<p class="propal-search-results__empty">Recherche indisponible.</p>`;
            songSearchResults.classList.remove("hidden");
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
  });

  songSearchResults?.addEventListener("click", (event) => {
    const pick = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-setlist-song-pick]");
    if (!pick) return;
    const result = lastSongSearchResults[Number(pick.dataset.setlistSongPick)];
    if (!result) return;
    if (songTitle) songTitle.value = result.title;
    if (songArtist) songArtist.value = result.artist;
    if (typeof result.durationSeconds === "number") {
      if (songMinutes) songMinutes.value = String(Math.floor(result.durationSeconds / 60));
      if (songSeconds) songSeconds.value = String(result.durationSeconds % 60);
    }
    updateSongPreview(result.title, result.artist, result.artworkUrl);
    clearSongSearch();
    songTempo?.focus();
  });

  songForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    ui.clearMessages();
    const minutes = Number(songMinutes?.value ?? 0);
    const seconds = Number(songSeconds?.value ?? 0);
    const durationSeconds = minutes * 60 + seconds;
    const tempo = Number(songTempo?.value ?? 0);
    const editId = songEditId?.value.trim() ?? "";
    const artworkUrl = songArtwork?.value.trim() || undefined;
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1) {
      ui.showError("Indiquez une durée valide (au moins 1 seconde).");
      return;
    }
    try {
      const payload = await apiJson(
        "/api/setlist/songs",
        editId ? "PATCH" : "POST",
        {
          ...(editId ? { id: editId } : {}),
          title: songTitle?.value ?? "",
          artist: songArtist?.value ?? "",
          durationSeconds,
          tempo,
          ...(artworkUrl ? { artworkUrl } : {}),
        },
      );
      songs = payload.songs;
      setlists = payload.setlists;
      renderSongs();
      renderSetlists();
      resetSongForm();
      ui.showStatus(editId ? "Titre mis à jour." : "Titre ajouté.");
    } catch (error) {
      ui.showError(error instanceof Error ? error.message : "Erreur.");
    }
  });

  songsListEl.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>("[data-song-id]");
    if (!row?.dataset.songId) return;
    const id = row.dataset.songId;
    if (target.closest("[data-song-edit]")) {
      const song = songs.find((item) => item.id === id);
      if (song) fillSongForm(song);
      return;
    }
    if (target.closest("[data-song-delete]")) {
      const song = songs.find((item) => item.id === id);
      if (!song || !window.confirm(`Supprimer « ${song.title} » ?`)) return;
      ui.clearMessages();
      try {
        const payload = await apiJson("/api/setlist/songs", "DELETE", { id });
        songs = payload.songs;
        setlists = payload.setlists;
        renderSongs();
        renderSetlists();
        if (songEditId?.value === id) resetSongForm();
        ui.showStatus("Titre supprimé.");
      } catch (error) {
        ui.showError(error instanceof Error ? error.message : "Erreur.");
      }
    }
  });

  setlistCreateBtn.addEventListener("click", async () => {
    ui.clearMessages();
    try {
      const payload = await apiJson(
        "/api/setlist/setlists",
        "POST",
        { name: "Nouvelle setlist", items: [] },
      );
      if (!payload.setlist?.id) throw new Error("Création impossible.");
      window.location.href = apiUrl(`/setlist/${payload.setlist.id}/`);
    } catch (error) {
      ui.showError(error instanceof Error ? error.message : "Erreur.");
    }
  });

  setlistsListEl.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>("[data-setlist-id]");
    if (!card?.dataset.setlistId) return;
    const id = card.dataset.setlistId;

    if (target.closest("[data-setlist-duplicate]")) {
      event.preventDefault();
      const setlist = setlists.find((item) => item.id === id);
      if (!setlist) return;
      ui.clearMessages();
      try {
        const baseName = setlist.name.replace(/\s*\(copie(?:\s+\d+)?\)\s*$/i, "").trim() || setlist.name;
        const existingCopyCount = setlists.filter((item) => {
          const normalized = item.name.replace(/\s*\(copie(?:\s+\d+)?\)\s*$/i, "").trim();
          return normalized === baseName && /\(copie/i.test(item.name);
        }).length;
        const copyName =
          existingCopyCount === 0 ? `${baseName} (copie)` : `${baseName} (copie ${existingCopyCount + 1})`;
        const payload = await apiJson(
          "/api/setlist/setlists",
          "POST",
          {
            name: copyName.slice(0, 120),
            items: (setlist.items ?? setlist.songs.map((song) => ({
              kind: "song" as const,
              songId: song.songId,
            }))).map((item) =>
              item.kind === "pause"
                ? { kind: "pause" as const, durationSeconds: item.durationSeconds }
                : { kind: "song" as const, songId: item.songId },
            ),
          },
        );
        songs = payload.songs;
        setlists = payload.setlists;
        renderSetlists();
        ui.showStatus("Setlist dupliquée.");
      } catch (error) {
        ui.showError(error instanceof Error ? error.message : "Erreur.");
      }
      return;
    }

    if (target.closest("[data-setlist-delete]")) {
      event.preventDefault();
      const setlist = setlists.find((item) => item.id === id);
      if (!setlist || !window.confirm(`Supprimer la setlist « ${setlist.name} » ?`)) return;
      ui.clearMessages();
      try {
        const payload = await apiJson("/api/setlist/setlists", "DELETE", { id });
        songs = payload.songs;
        setlists = payload.setlists;
        renderSetlists();
        ui.showStatus("Setlist supprimée.");
      } catch (error) {
        ui.showError(error instanceof Error ? error.message : "Erreur.");
      }
    }
  });
}

/* ─── DETAIL PAGE ───────────────────────────────────────── */

function initDetailPage(root: HTMLElement): void {
  const setlistId = root.dataset.setlistId?.trim() ?? "";
  if (!setlistId) return;

  const setlistForm = root.querySelector<HTMLFormElement>("[data-setlist-form]");
  const setlistEditId = root.querySelector<HTMLInputElement>("[data-setlist-edit-id]");
  const setlistName = root.querySelector<HTMLInputElement>("[data-setlist-name]");
  const setlistMetaFields = root.querySelector<HTMLElement>("[data-setlist-meta-fields]");
  const setlistNameDisplay = root.querySelector<HTMLElement>("[data-setlist-name-display]");
  const setlistMetaEdit = root.querySelector<HTMLButtonElement>("[data-setlist-meta-edit]");
  const setlistMetaDone = root.querySelector<HTMLButtonElement>("[data-setlist-meta-done]");
  const setlistTitleRow = root.querySelector<HTMLElement>("[data-setlist-title-row]");
  const setlistFormTitle = root.querySelector<HTMLElement>("[data-setlist-form-title]");
  const setlistPickedEl = root.querySelector<HTMLElement>("[data-setlist-picked]");
  const setlistAddOpen = root.querySelector<HTMLButtonElement>("[data-setlist-add-open]");
  const setlistEstimate = root.querySelector<HTMLElement>("[data-setlist-estimate]");
  const printBtn = root.querySelector<HTMLButtonElement>("[data-setlist-print]");
  const fullscreenOpenBtn = root.querySelector<HTMLButtonElement>("[data-setlist-fullscreen-open]");
  const deleteBtn = root.querySelector<HTMLButtonElement>("[data-setlist-delete]");
  const setlistSubmit = root.querySelector<HTMLButtonElement>("[data-setlist-submit]");

  const addModal = document.querySelector<HTMLElement>("[data-setlist-add-modal]");
  const setlistAddSong = document.querySelector<HTMLSelectElement>("[data-setlist-add-song]");
  const setlistAddAll = document.querySelector<HTMLButtonElement>("[data-setlist-add-all]");
  const setlistAddPause = document.querySelector<HTMLButtonElement>("[data-setlist-add-pause]");
  const addModalFeedback = document.querySelector<HTMLElement>("[data-setlist-add-feedback]");
  const addModalCloseButtons = document.querySelectorAll<HTMLElement>("[data-setlist-add-close]");

  const fullscreenEl = document.querySelector<HTMLElement>("[data-setlist-fullscreen]");
  const printRoot = document.querySelector<HTMLElement>("[data-setlist-print-root]");
  const fullscreenTitle = document.querySelector<HTMLElement>("[data-setlist-fullscreen-title]");
  const fullscreenEstimate = document.querySelector<HTMLElement>("[data-setlist-fullscreen-estimate]");
  const fullscreenList = document.querySelector<HTMLElement>("[data-setlist-fullscreen-list]");
  const fullscreenClose = document.querySelector<HTMLButtonElement>("[data-setlist-fullscreen-close]");
  const fullscreenPrint = document.querySelector<HTMLButtonElement>("[data-setlist-fullscreen-print]");

  if (
    !setlistForm ||
    !setlistMetaFields ||
    !setlistNameDisplay ||
    !setlistMetaEdit ||
    !setlistPickedEl ||
    !setlistAddOpen ||
    !addModal ||
    !setlistAddSong ||
    !setlistAddAll ||
    !setlistAddPause ||
    !fullscreenEl ||
    !printRoot ||
    !fullscreenTitle ||
    !fullscreenEstimate ||
    !fullscreenList ||
    !fullscreenClose ||
    !fullscreenPrint
  ) {
    return;
  }

  let songs: Song[] = [];
  let current: Setlist | null = null;
  let pickedItems: PickedItem[] = [];
  let savedDraft = "";

  const ui = setupUi(root);

  function syncSaveButton(): void {
    if (!setlistSubmit) return;
    const dirty =
      savedDraft !== "" &&
      serializeSetlistDraft(setlistName?.value ?? "", pickedItems) !== savedDraft;
    setlistSubmit.disabled = !dirty;
  }

  function markSavedDraft(): void {
    savedDraft = serializeSetlistDraft(setlistName?.value ?? "", pickedItems);
    syncSaveButton();
  }

  void (async () => {
    try {
      const data = await fetchList();
      songs = data.songs;
      current = data.setlists.find((item) => item.id === setlistId) ?? null;
      if (!current) {
        ui.showError("Setlist introuvable.");
        window.setTimeout(() => {
          window.location.href = apiUrl("/setlist/");
        }, 1200);
        return;
      }
      loadSetlistIntoForm(current);
    } catch (error) {
      ui.showError(error instanceof Error ? error.message : "Chargement impossible.");
    }
  })();

  function showMetaFields(): void {
    setlistMetaFields.classList.remove("hidden");
    setlistTitleRow?.classList.add("hidden");
    if (setlistName) setlistName.required = true;
  }

  function showMetaReadonly(): void {
    const name = setlistName?.value.trim() || current?.name || "Sans nom";
    setlistNameDisplay.textContent = name;
    if (setlistFormTitle && setlistFormTitle !== setlistNameDisplay) {
      setlistFormTitle.textContent = name;
    }
    setlistMetaFields.classList.add("hidden");
    setlistTitleRow?.classList.remove("hidden");
    if (setlistName) setlistName.required = false;
    syncSaveButton();
  }

  function pickedSongIds(): string[] {
    return pickedItems
      .filter((item): item is PickedSong => item.kind === "song")
      .map((item) => item.songId);
  }

  function buildPreviewSetlist(): Setlist {
    const items = pickedToSetlistItems(pickedItems, songs);
    const summary = summarizeSetlistDurations(items);
    return {
      ...(current as Setlist),
      name: setlistName?.value.trim() || current?.name || "Setlist",
      items,
      songs: items
        .filter((item): item is Extract<SetlistItem, { kind: "song" }> => item.kind === "song")
        .map((item, position) => ({
          songId: item.songId,
          position,
          title: item.title,
          artist: item.artist,
          durationSeconds: item.durationSeconds,
          tempo: item.tempo,
          ...(item.artworkUrl ? { artworkUrl: item.artworkUrl } : {}),
        })),
      groups: summary.groups,
      estimatedDurationSeconds: summary.estimatedDurationSeconds,
      estimatedTotalSeconds: summary.estimatedTotalSeconds,
      pauseDurationSeconds: summary.pauseDurationSeconds,
    };
  }

  let pickedSortable: Sortable | null = null;

  function syncPickedOrderFromDom(): void {
    const keys = [...setlistPickedEl.querySelectorAll<HTMLElement>("[data-picked-key]")]
      .map((row) => row.dataset.pickedKey)
      .filter((key): key is string => Boolean(key));
    if (keys.length === 0) return;
    const byKey = new Map(pickedItems.map((item) => [item.key, item]));
    const next = keys.map((key) => byKey.get(key)).filter((item): item is PickedItem => Boolean(item));
    if (next.length === pickedItems.length) pickedItems = next;
  }

  function bindPickedSortable(): void {
    pickedSortable?.destroy();
    pickedSortable = null;
    if (!setlistPickedEl.querySelector("[data-picked-key]")) return;

    pickedSortable = Sortable.create(setlistPickedEl, {
      animation: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      handle: "[data-picked-handle]",
      draggable: "[data-picked-key]",
      filter: ".setlist-group-header",
      preventOnFilter: true,
      ghostClass: "setlist-picked-row--ghost",
      chosenClass: "setlist-picked-row--chosen",
      dragClass: "setlist-picked-row--drag",
      forceFallback: true,
      fallbackOnBody: true,
      fallbackClass: "setlist-picked-row--fallback",
      fallbackTolerance: 3,
      swapThreshold: 0.65,
      direction: "vertical",
      delayOnTouchOnly: true,
      delay: 80,
      touchStartThreshold: 4,
      onStart: () => {
        setlistPickedEl.classList.add("setlist-picked--dragging");
        document.body.classList.add("setlist-picked-dragging-cursor");
      },
      onEnd: () => {
        setlistPickedEl.classList.remove("setlist-picked--dragging");
        document.body.classList.remove("setlist-picked-dragging-cursor");
        syncPickedOrderFromDom();
        renderPickedItems();
      },
    });
  }

  function renderAddSongSelect(): void {
    const used = new Set(pickedSongIds());
    const available = songs.filter((song) => !used.has(song.id));
    setlistAddSong.innerHTML =
      `<option value="">Choisir un titre…</option>` +
      available
        .map(
          (song) =>
            `<option value="${escapeHtml(song.id)}">${escapeHtml(song.title)}${song.artist ? ` — ${escapeHtml(song.artist)}` : ""}</option>`,
        )
        .join("");
    setlistAddSong.disabled = available.length === 0;
    setlistAddAll.disabled = available.length === 0;
    setlistAddAll.textContent =
      available.length === 0
        ? "Tous les titres sont déjà dans la setlist"
        : `Ajouter tous les titres disponibles (${available.length})`;
  }

  function renderPickedItems(): void {
    const resolved = pickedToSetlistItems(pickedItems, songs);
    if (setlistEstimate) setlistEstimate.innerHTML = formatEstimateSummary(resolved);

    if (pickedItems.length === 0) {
      pickedSortable?.destroy();
      pickedSortable = null;
      setlistPickedEl.innerHTML = `<p class="text-sm text-text-muted">Aucun titre ni pause pour l’instant.</p>`;
      syncSaveButton();
      return;
    }

    const groups = computeSetlistGroups(resolved);
    const showGroups = groups.length > 1 || resolved.some((item) => item.kind === "pause");
    const chunks: string[] = [];
    let groupIndex = 0;
    let pendingGroupHeader = showGroups;

    for (const item of pickedItems) {
      if (item.kind === "pause") {
        pendingGroupHeader = showGroups;
        const minutes = Math.round(item.durationSeconds / 60);
        chunks.push(`
          <div class="setlist-picked-row setlist-picked-row--pause" data-picked-key="${escapeHtml(item.key)}" data-picked-kind="pause">
            <button type="button" class="setlist-drag-handle" data-picked-handle aria-label="Déplacer la pause" title="Glisser pour réordonner">${ICON_GRIP}</button>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text">Pause</p>
              <label class="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <span>Durée</span>
                <input
                  type="number"
                  class="setlist-pause-duration"
                  min="1"
                  max="90"
                  step="1"
                  value="${minutes}"
                  data-pause-minutes
                  aria-label="Durée de la pause en minutes"
                />
                <span>min</span>
              </label>
            </div>
            <div class="setlist-picked-row__actions">
              <button type="button" class="setlist-icon-btn setlist-icon-btn--danger" data-picked-remove aria-label="Retirer">${ICON_DELETE}</button>
            </div>
          </div>
        `);
        continue;
      }

      if (pendingGroupHeader) {
        const group = groups[groupIndex];
        if (group) {
          chunks.push(`
            <div class="setlist-group-header" aria-hidden="true">
              <span class="setlist-group-header__label">${escapeHtml(group.label)}</span>
              <span>${escapeHtml(formatDurationSummary(group.durationSeconds))} · ${group.songCount} titre${group.songCount > 1 ? "s" : ""}</span>
            </div>
          `);
          groupIndex += 1;
        }
        pendingGroupHeader = false;
      }

      const song = songs.find((entry) => entry.id === item.songId);
      if (!song) continue;
      chunks.push(`
        <div class="setlist-picked-row" data-picked-key="${escapeHtml(item.key)}" data-picked-kind="song">
          <button type="button" class="setlist-drag-handle" data-picked-handle aria-label="Déplacer ${escapeHtml(song.title)}" title="Glisser pour réordonner">${ICON_GRIP}</button>
          ${renderArtwork(song.artworkUrl, `${song.title} — ${song.artist || "Artiste"}`, "sm")}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-text">${escapeHtml(song.title)}</p>
            <p class="truncate text-xs text-text-muted">${escapeHtml(song.artist || "—")} · ${formatDuration(song.durationSeconds)} · ${song.tempo} BPM</p>
          </div>
          <div class="setlist-picked-row__actions">
            <button type="button" class="setlist-icon-btn setlist-icon-btn--danger" data-picked-remove aria-label="Retirer">${ICON_DELETE}</button>
          </div>
        </div>
      `);
    }

    setlistPickedEl.innerHTML = chunks.join("");
    bindPickedSortable();
    syncSaveButton();
  }

  function loadSetlistIntoForm(setlist: Setlist): void {
    if (setlistEditId) setlistEditId.value = setlist.id;
    if (setlistName) setlistName.value = setlist.name;
    const sourceItems =
      setlist.items ??
      setlist.songs.map((song) => ({
        kind: "song" as const,
        id: song.songId,
        position: song.position,
        songId: song.songId,
        title: song.title,
        artist: song.artist,
        durationSeconds: song.durationSeconds,
        tempo: song.tempo,
        ...(song.artworkUrl ? { artworkUrl: song.artworkUrl } : {}),
      }));
    pickedItems = sourceItems.map((item) =>
      item.kind === "pause"
        ? { kind: "pause", key: item.id || newClientKey(), durationSeconds: item.durationSeconds }
        : { kind: "song", key: item.id || item.songId, songId: item.songId },
    );
    document.title = `${setlist.name} — H8F4`;
    showMetaReadonly();
    renderPickedItems();
    renderAddSongSelect();
    markSavedDraft();
  }

  const printSheet = printRoot.parentElement;

  function resetPrintScale(): void {
    printRoot.classList.remove("setlist-fullscreen__print-root--measure");
    printRoot.style.removeProperty("--print-scale");
    printRoot.style.removeProperty("width");
    printRoot.style.removeProperty("transform");
    printRoot.style.removeProperty("transform-origin");
    printRoot.style.removeProperty("height");
    printRoot.style.removeProperty("overflow");
    printRoot.style.removeProperty("zoom");
    printRoot.style.removeProperty("margin-bottom");
    if (printSheet instanceof HTMLElement) {
      printSheet.style.removeProperty("height");
      printSheet.style.removeProperty("max-height");
      printSheet.style.removeProperty("overflow");
    }
    fullscreenEl.style.removeProperty("height");
    fullscreenEl.style.removeProperty("max-height");
    fullscreenEl.style.removeProperty("overflow");
  }

  function applyPrintScale(): void {
    resetPrintScale();
    const pageWidthMm = 190;
    const pageHeightPx = 277 * (96 / 25.4);

    // Mesure en styles print (compact), sans transform.
    printRoot.classList.add("setlist-fullscreen__print-root--measure");
    printRoot.style.width = `${pageWidthMm}mm`;
    printRoot.style.transform = "none";
    printRoot.style.zoom = "1";
    printRoot.style.height = "auto";
    printRoot.style.overflow = "visible";
    void printRoot.offsetHeight;
    const contentHeight = Math.max(printRoot.scrollHeight, 1);
    printRoot.classList.remove("setlist-fullscreen__print-root--measure");

    const targetHeight = pageHeightPx * 0.95;
    let scale = targetHeight / contentHeight;
    if (scale >= 1) scale = Math.min(scale, 1.35);
    // Pas de plancher : il faut toujours tout faire tenir (pause + set 2 inclus).

    const scaledHeight = Math.ceil(contentHeight * scale);
    const supportsZoom =
      typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("zoom", "0.5");

    printRoot.style.setProperty("--print-scale", scale.toFixed(4));
    printRoot.style.height = "auto";
    printRoot.style.overflow = "visible";

    if (supportsZoom) {
      // `zoom` réduit aussi la boîte de layout → pause / set 2 restent visibles.
      printRoot.style.removeProperty("transform");
      printRoot.style.removeProperty("transform-origin");
      printRoot.style.removeProperty("margin-bottom");
      printRoot.style.width = `${pageWidthMm}mm`;
      printRoot.style.zoom = scale.toFixed(4);
    } else {
      // Fallback transform + marge négative pour récupérer l’espace layout.
      printRoot.style.removeProperty("zoom");
      printRoot.style.transformOrigin = "top left";
      printRoot.style.transform = `scale(${scale.toFixed(4)})`;
      printRoot.style.width = `${(pageWidthMm / scale).toFixed(4)}mm`;
      printRoot.style.marginBottom = `${Math.round(scaledHeight - contentHeight)}px`;
    }

    if (printSheet instanceof HTMLElement) {
      printSheet.style.height = "auto";
      printSheet.style.maxHeight = "none";
      printSheet.style.overflow = "visible";
    }
    fullscreenEl.style.height = "auto";
    fullscreenEl.style.maxHeight = "none";
    fullscreenEl.style.overflow = "visible";
  }

  async function exitNativeFullscreen(): Promise<void> {
    if (document.fullscreenElement === fullscreenEl && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
  }

  async function openFullscreen(setlist: Setlist, native = true): Promise<void> {
    const items = setlist.items ?? [];
    const summary = summarizeSetlistDurations(items);
    const estimateLines = [
      `${setlist.songs.length} titre${setlist.songs.length > 1 ? "s" : ""} · Jeu : ${formatDurationSummary(summary.estimatedDurationSeconds)}`,
    ];
    if (summary.pauseDurationSeconds > 0) {
      estimateLines.push(
        `Pauses : ${formatDurationSummary(summary.pauseDurationSeconds)} · Total : ${formatDurationSummary(summary.estimatedTotalSeconds)}`,
      );
    }
    fullscreenTitle.textContent = setlist.name;
    fullscreenEstimate.textContent = estimateLines.join("\n");

    if (items.length === 0) {
      fullscreenList.innerHTML = `<li class="setlist-fullscreen__empty">Aucun titre dans cette setlist.</li>`;
    } else {
      const showGroups = summary.groups.length > 1 || items.some((item) => item.kind === "pause");
      const chunks: string[] = [];
      let groupIndex = 0;
      let songNumber = 0;
      let pendingGroupHeader = showGroups;

      for (const item of items) {
        if (item.kind === "pause") {
          pendingGroupHeader = showGroups;
          chunks.push(`
            <li class="setlist-fullscreen__pause">
              <span class="setlist-fullscreen__pause-line" aria-hidden="true"></span>
              <span class="setlist-fullscreen__pause-label">Pause · ${formatDuration(item.durationSeconds)}</span>
              <span class="setlist-fullscreen__pause-line" aria-hidden="true"></span>
            </li>
          `);
          continue;
        }

        if (pendingGroupHeader) {
          const group = summary.groups[groupIndex];
          if (group) {
            chunks.push(`
              <li class="setlist-fullscreen__group">
                <span>${escapeHtml(group.label)}</span>
                <span>${formatDuration(group.durationSeconds)}</span>
              </li>
            `);
            groupIndex += 1;
          }
          pendingGroupHeader = false;
        }

        songNumber += 1;
        chunks.push(`
          <li class="setlist-fullscreen__item">
            <span class="setlist-fullscreen__num">${songNumber}</span>
            ${renderArtwork(item.artworkUrl, `${item.title} — ${item.artist || "Artiste"}`, "sm")}
            <div class="min-w-0 flex-1">
              <p class="setlist-fullscreen__song">${escapeHtml(item.title)}</p>
              <p class="setlist-fullscreen__artist">${escapeHtml(item.artist || "—")}</p>
            </div>
            <div class="setlist-fullscreen__meta">
              <span>${formatDuration(item.durationSeconds)}</span>
              <span>${item.tempo} BPM</span>
            </div>
          </li>
        `);
      }
      fullscreenList.innerHTML = chunks.join("");
    }

    fullscreenEl.hidden = false;
    fullscreenEl.classList.add("setlist-fullscreen--open");
    document.body.classList.add("setlist-fullscreen-active");
    fullscreenClose.focus();
    if (!native) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await fullscreenEl.requestFullscreen?.();
    } catch {
      // overlay only
    }
  }

  async function closeFullscreen(): Promise<void> {
    resetPrintScale();
    fullscreenEl.classList.remove("setlist-fullscreen--open");
    fullscreenEl.hidden = true;
    document.body.classList.remove("setlist-fullscreen-active");
    await exitNativeFullscreen();
  }

  let printOpenedOverlay = false;

  function finishPrintSession(): void {
    resetPrintScale();
    if (!printOpenedOverlay) return;
    printOpenedOverlay = false;
    void closeFullscreen();
  }

  async function printCurrent(): Promise<void> {
    if (!current) return;
    const wasOpen = fullscreenEl.classList.contains("setlist-fullscreen--open");
    printOpenedOverlay = !wasOpen;
    await exitNativeFullscreen();
    await openFullscreen(buildPreviewSetlist(), false);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    applyPrintScale();
    window.print();
    window.setTimeout(finishPrintSession, 250);
  }

  function clearAddModalFeedback(): void {
    if (!addModalFeedback) return;
    addModalFeedback.textContent = "";
    addModalFeedback.classList.add("hidden");
  }

  function showAddModalFeedback(message: string): void {
    if (!addModalFeedback) return;
    addModalFeedback.textContent = message;
    addModalFeedback.classList.remove("hidden");
  }

  function openAddModal(): void {
    clearAddModalFeedback();
    renderAddSongSelect();
    addModal.hidden = false;
    document.body.classList.add("setlist-add-modal-open");
    window.setTimeout(() => setlistAddSong.focus(), 0);
  }

  function closeAddModal(): void {
    addModal.hidden = true;
    document.body.classList.remove("setlist-add-modal-open");
    clearAddModalFeedback();
    setlistAddOpen.focus();
  }

  setlistMetaEdit.addEventListener("click", () => {
    showMetaFields();
    setlistName?.focus();
  });

  setlistMetaDone?.addEventListener("click", () => {
    showMetaReadonly();
  });

  root.querySelectorAll<HTMLDetailsElement>(".setlist-more-menu").forEach((menu) => {
    menu.querySelectorAll<HTMLElement>("[role='menuitem']").forEach((item) => {
      item.addEventListener("click", () => {
        menu.open = false;
      });
    });
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      const close = (event: MouseEvent) => {
        const target = event.target;
        if (target instanceof Node && menu.contains(target)) return;
        menu.open = false;
        document.removeEventListener("click", close);
      };
      window.setTimeout(() => document.addEventListener("click", close), 0);
    });
  });

  setlistAddOpen.addEventListener("click", () => {
    openAddModal();
  });

  for (const button of addModalCloseButtons) {
    button.addEventListener("click", () => {
      closeAddModal();
    });
  }

  setlistAddSong.addEventListener("change", () => {
    const id = setlistAddSong.value;
    if (!id || pickedSongIds().includes(id)) return;
    const song = songs.find((entry) => entry.id === id);
    pickedItems.push({ kind: "song", key: newClientKey(), songId: id });
    setlistAddSong.value = "";
    renderPickedItems();
    renderAddSongSelect();
    const title = song?.title?.trim() || "Titre";
    showAddModalFeedback(`« ${title} » ajouté à la setlist.`);
    ui.showStatus(`« ${title} » ajouté à la setlist.`);
  });

  setlistAddAll.addEventListener("click", () => {
    const used = new Set(pickedSongIds());
    const availableIds = songs.filter((song) => !used.has(song.id)).map((song) => song.id);
    if (availableIds.length === 0) return;
    for (const songId of availableIds) {
      pickedItems.push({ kind: "song", key: newClientKey(), songId });
    }
    renderPickedItems();
    renderAddSongSelect();
    closeAddModal();
  });

  setlistAddPause.addEventListener("click", () => {
    pickedItems.push({
      kind: "pause",
      key: newClientKey(),
      durationSeconds: DEFAULT_PAUSE_SECONDS,
    });
    renderPickedItems();
    closeAddModal();
  });

  setlistPickedEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-picked-remove]")) return;
    const row = target.closest<HTMLElement>("[data-picked-key]");
    const key = row?.dataset.pickedKey;
    if (!key) return;
    const index = pickedItems.findIndex((item) => item.key === key);
    if (index < 0) return;
    pickedItems.splice(index, 1);
    renderPickedItems();
    renderAddSongSelect();
  });

  setlistPickedEl.addEventListener("change", (event) => {
    const target = event.target as HTMLElement;
    const input = target.closest<HTMLInputElement>("[data-pause-minutes]");
    if (!input) return;
    const row = input.closest<HTMLElement>("[data-picked-key]");
    const key = row?.dataset.pickedKey;
    if (!key) return;
    const item = pickedItems.find((entry) => entry.key === key);
    if (!item || item.kind !== "pause") return;
    const minutes = Number.parseInt(input.value, 10);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 90) {
      input.value = String(Math.round(item.durationSeconds / 60));
      return;
    }
    item.durationSeconds = minutes * 60;
    renderPickedItems();
  });

  setlistName?.addEventListener("input", () => {
    syncSaveButton();
  });

  setlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (setlistSubmit?.disabled) return;
    ui.clearMessages();
    try {
      const payload = await apiJson("/api/setlist/setlists", "PATCH", {
        id: setlistId,
        name: setlistName?.value ?? "",
        items: itemsToPayload(pickedItems),
      });
      songs = payload.songs;
      current = payload.setlists.find((item) => item.id === setlistId) ?? payload.setlist ?? current;
      if (current) loadSetlistIntoForm(current);
      ui.showStatus("Setlist enregistrée.");
    } catch (error) {
      ui.showError(error instanceof Error ? error.message : "Erreur.");
    }
  });

  printBtn?.addEventListener("click", () => {
    void printCurrent();
  });

  fullscreenOpenBtn?.addEventListener("click", () => {
    if (!current) return;
    void openFullscreen(buildPreviewSetlist());
  });

  deleteBtn?.addEventListener("click", async () => {
    if (!current || !window.confirm(`Supprimer la setlist « ${current.name} » ?`)) return;
    ui.clearMessages();
    try {
      await apiJson("/api/setlist/setlists", "DELETE", { id: setlistId });
      window.location.href = apiUrl("/setlist/?tab=setlists");
    } catch (error) {
      ui.showError(error instanceof Error ? error.message : "Erreur.");
    }
  });

  fullscreenClose.addEventListener("click", () => {
    void closeFullscreen();
  });

  fullscreenPrint.addEventListener("click", () => {
    void printCurrent();
  });

  window.addEventListener("beforeprint", () => {
    if (fullscreenEl.classList.contains("setlist-fullscreen--open")) applyPrintScale();
  });

  window.addEventListener("afterprint", () => {
    finishPrintSession();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!addModal.hidden) {
      closeAddModal();
      return;
    }
    if (fullscreenEl.classList.contains("setlist-fullscreen--open")) {
      void closeFullscreen();
    }
  });
}

function init(): void {
  const root = document.querySelector<HTMLElement>("[data-setlist-app]");
  if (!root) return;
  const page = (root.dataset.setlistPage as PageMode | undefined) ?? "list";
  if (page === "detail") initDetailPage(root);
  else initListPage(root);
}

init();
