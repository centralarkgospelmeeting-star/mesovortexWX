import { DEFAULT_WORKSPACE_PREFS, WORKSPACE_SCHEMA_VERSION, type WorkspacePrefsV1 } from './types';

const STORAGE_KEY = 'mesovortexwx.workspace.v1';

export function loadWorkspacePrefs(): WorkspacePrefsV1 {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_PREFS;
    const parsed = JSON.parse(raw) as Partial<WorkspacePrefsV1>;
    if (parsed.schemaVersion !== WORKSPACE_SCHEMA_VERSION) return DEFAULT_WORKSPACE_PREFS;
    return {
      ...DEFAULT_WORKSPACE_PREFS,
      ...parsed,
      layers: { ...DEFAULT_WORKSPACE_PREFS.layers, ...(parsed.layers || {}) },
    };
  } catch {
    return DEFAULT_WORKSPACE_PREFS;
  }
}

export function saveWorkspacePrefs(prefs: WorkspacePrefsV1) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota/privacy errors
  }
}

export function clearWorkspacePrefs() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
