import { DEFAULT_WORKSPACE_PREFS, WORKSPACE_SCHEMA_VERSION, type WorkspacePrefsV1 } from './types';

const STORAGE_KEY = 'mesovortexwx.workspace.v1';
const FAVORITES_KEY = 'mesovortexwx.favorites.v1';

function migratePrefs(parsed: Partial<WorkspacePrefsV1>): WorkspacePrefsV1 {
  const base = { ...DEFAULT_WORKSPACE_PREFS };
  const layers = {
    ...DEFAULT_WORKSPACE_PREFS.layers,
    ...(parsed.layers || {}),
  };
  return {
    ...base,
    ...parsed,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    layers,
    favorites: Array.isArray(parsed.favorites)
      ? parsed.favorites.filter((id) => typeof id === 'string')
      : base.favorites,
  };
}

export function loadWorkspacePrefs(): WorkspacePrefsV1 {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_PREFS;
    return migratePrefs(JSON.parse(raw) as Partial<WorkspacePrefsV1>);
  } catch {
    return DEFAULT_WORKSPACE_PREFS;
  }
}

export function saveWorkspacePrefs(prefs: WorkspacePrefsV1) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, schemaVersion: WORKSPACE_SCHEMA_VERSION })
    );
  } catch {}
}

export function clearWorkspacePrefs() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function exportWorkspaceJson(prefs?: WorkspacePrefsV1): string {
  const data = prefs ?? loadWorkspacePrefs();
  return JSON.stringify(
    { ...data, exportedAt: new Date().toISOString(), app: 'MesoVortexWX' },
    null,
    2
  );
}

export function downloadWorkspaceExport(filename = 'mesovortexwx-workspace.json') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([exportWorkspaceJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importWorkspaceJson(json: string): WorkspacePrefsV1 | null {
  try {
    const parsed = JSON.parse(json) as Partial<WorkspacePrefsV1>;
    if (!parsed || typeof parsed !== 'object') return null;
    const merged = migratePrefs(parsed);
    saveWorkspacePrefs(merged);
    return merged;
  } catch {
    return null;
  }
}

export function loadFavorites(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_PREFS.favorites ?? [];
  try {
    const fromWorkspace = loadWorkspacePrefs().favorites;
    if (fromWorkspace?.length) return fromWorkspace;
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return DEFAULT_WORKSPACE_PREFS.favorites ?? [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return DEFAULT_WORKSPACE_PREFS.favorites ?? [];
  }
}

export function saveFavorites(ids: string[]) {
  if (typeof window === 'undefined') return;
  const unique = Array.from(new Set(ids.map((id) => id.toUpperCase())));
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(unique));
    const prefs = loadWorkspacePrefs();
    saveWorkspacePrefs({ ...prefs, favorites: unique });
  } catch {}
}

export function toggleFavorite(siteId: string): string[] {
  const id = siteId.toUpperCase();
  const current = loadFavorites();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  saveFavorites(next);
  return next;
}

export function isFavorite(siteId: string): boolean {
  return loadFavorites().includes(siteId.toUpperCase());
}
