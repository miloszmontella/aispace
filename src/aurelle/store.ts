import { create } from "zustand";
import { unlockWithBiometric } from "@/aurelle/bio";
import { DEMOS, demoProfiles } from "@/aurelle/demo";
import {
  adoptKey,
  changePin,
  clearBio,
  deleteProfile,
  disablePin,
  enablePin,
  exportBackup,
  getCover,
  getMeta,
  importBackup,
  listProfiles,
  lockSession,
  primeThumb,
  putCover,
  putMeta,
  revokeAll,
  saveProfile,
  setAutoLock,
  trackVaultTask,
  unlock,
  vaultReady,
  verifyPin,
} from "@/aurelle/db";
import { telegramHandle } from "@/aurelle/format";
import { coverFromFile, variantsFromFile } from "@/aurelle/images";
import type {
  ConfirmState,
  Filters,
  PhotoDraft,
  PinFlow,
  Profile,
  Screen,
  SortKey,
  Tier,
  TierFilter,
  ViewMode,
} from "@/aurelle/types";
import { DEFAULT_FILTERS } from "@/aurelle/types";

const PREF_KEY = "aurelle-prefs";
const FAIL_KEY = "aurelle-fails";
const UNTIL_KEY = "aurelle-until";

type Prefs = { viewMode: ViewMode; sort: SortKey; coverX: number; coverY: number; monoCatalog: boolean };

const DEFAULT_COVER = { coverX: 62, coverY: 18 };
const PHOTO_REV = "4";
const COPY_REV = "en2";

function loadPrefs(): Prefs {
  const fallback: Prefs = { viewMode: "grid", sort: "new", monoCatalog: true, ...DEFAULT_COVER };
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const coverX = Number(parsed.coverX);
    const coverY = Number(parsed.coverY);
    return {
      viewMode: parsed.viewMode === "list" ? "list" : "grid",
      sort: parsed.sort ?? "new",
      monoCatalog: parsed.monoCatalog !== false,
      coverX: Number.isFinite(coverX) ? Math.min(100, Math.max(0, coverX)) : DEFAULT_COVER.coverX,
      coverY: Number.isFinite(coverY) ? Math.min(100, Math.max(0, coverY)) : DEFAULT_COVER.coverY,
    };
  } catch {
    return fallback;
  }
}

function savePrefs(partial: Partial<Prefs>) {
  const next = { ...loadPrefs(), ...partial };
  localStorage.setItem(PREF_KEY, JSON.stringify(next));
}

function explain(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  ) {
    return "Not enough space on this device";
  }
  return "Could not save";
}

function upsert(profiles: Profile[], profile: Profile): Profile[] {
  const index = profiles.findIndex((item) => item.id === profile.id);
  if (index === -1) return [profile, ...profiles];
  const next = profiles.slice();
  next[index] = profile;
  return next;
}

async function persistDemos(getProfiles: () => Profile[]) {
  const meta = await getMeta();
  if (!meta) {
    await putMeta({ encrypted: false, seeded: false, autoLockMs: 60_000 });
  }
  for (const demo of DEMOS) {
    const current = getProfiles().find((profile) => profile.id === demo.id);
    if (!current) continue;
    const already = (await listProfiles()).some((profile) => profile.id === demo.id);
    if (already) continue;
    try {
      const response = await fetch(demo.photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${demo.id}.jpg`, { type: blob.type || "image/jpeg" });
      const variants = await variantsFromFile(file);
      const fresh = getProfiles().find((profile) => profile.id === demo.id);
      if (!fresh) continue;
      await saveProfile(fresh, [{ id: demo.photoId, thumb: variants.thumb, full: variants.full }], []);
    } catch (error) {
      console.error(error);
    }
  }
  const currentMeta = await getMeta();
  if (currentMeta && !currentMeta.seeded) {
    await putMeta({ ...currentMeta, seeded: true });
  }
  localStorage.setItem("aurelle-photo-rev", PHOTO_REV);
}

async function addMissingDemos(existing: Profile[]): Promise<{ profiles: Profile[]; added: boolean }> {
  const missing = demoProfiles().filter((demo) => !existing.some((item) => item.id === demo.id));
  if (missing.length === 0) return { profiles: existing, added: false };
  const next = [...missing, ...existing];
  for (const demo of DEMOS) {
    if (!missing.some((item) => item.id === demo.id)) continue;
    primeThumb(demo.photoId, demo.photoUrl);
    try {
      const response = await fetch(demo.photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${demo.id}.jpg`, { type: "image/jpeg" });
      const variants = await variantsFromFile(file);
      const profile = next.find((item) => item.id === demo.id);
      if (!profile) continue;
      await saveProfile(profile, [{ id: demo.photoId, thumb: variants.thumb, full: variants.full }], []);
    } catch (error) {
      console.error(error);
    }
  }
  return { profiles: next, added: true };
}

async function refreshDemoPhotos(existing: Profile[]): Promise<Profile[]> {
  if (localStorage.getItem("aurelle-photo-rev") === PHOTO_REV) return existing;
  const next = existing.map((profile) => {
    const demo = DEMOS.find((item) => item.id === profile.id);
    return demo ? { ...profile, photoIds: [demo.photoId] } : profile;
  });
  for (const demo of DEMOS) primeThumb(demo.photoId, demo.photoUrl);
  for (const demo of DEMOS) {
    const before = existing.find((profile) => profile.id === demo.id);
    const profile = next.find((item) => item.id === demo.id);
    if (!before || !profile) continue;
    try {
      const response = await fetch(demo.photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${demo.id}.jpg`, { type: "image/jpeg" });
      const variants = await variantsFromFile(file);
      const removed = before.photoIds.filter((id) => id !== demo.photoId);
      await saveProfile(profile, [{ id: demo.photoId, thumb: variants.thumb, full: variants.full }], removed);
    } catch (error) {
      console.error(error);
    }
  }
  localStorage.setItem("aurelle-photo-rev", PHOTO_REV);
  return next;
}

async function localizeDemos(existing: Profile[]): Promise<Profile[]> {
  if (localStorage.getItem("aurelle-copy-rev") === COPY_REV) return existing;
  const next = existing.map((profile) => {
    const demo = DEMOS.find((item) => item.id === profile.id);
    if (!demo) return profile;
    if (
      profile.name === demo.name &&
      profile.city === demo.city &&
      profile.notes === demo.notes &&
      profile.height === demo.height
    ) {
      return profile;
    }
    return { ...profile, name: demo.name, city: demo.city, notes: demo.notes, height: demo.height, updatedAt: Date.now() };
  });
  for (const profile of next) {
    const prev = existing.find((item) => item.id === profile.id);
    if (
      !prev ||
      (prev.name === profile.name && prev.city === profile.city && prev.notes === profile.notes && prev.height === profile.height)
    ) {
      continue;
    }
    try {
      await saveProfile(profile, [], []);
    } catch (error) {
      console.error(error);
    }
  }
  localStorage.setItem("aurelle-copy-rev", COPY_REV);
  return next;
}

let bootPromise: Promise<void> | null = null;

export type AurelleState = {
  booted: boolean;
  bootError: string | null;
  locked: boolean;
  encrypted: boolean;
  hasBio: boolean;
  covered: boolean;
  busy: string | null;
  toast: string | null;
  profiles: Profile[];
  view: Screen;
  origin: Screen;
  profileId: string | null;
  editId: string | null;
  tier: TierFilter;
  inCatalog: boolean;
  query: string;
  sort: SortKey;
  viewMode: ViewMode;
  filters: Filters;
  filterOpen: boolean;
  sortOpen: boolean;
  tierPickFor: string | null;
  confirm: ConfirmState | null;
  pinFlow: PinFlow;
  autoLockMs: number;
  homeCover: string | null;
  coverX: number;
  coverY: number;
  monoCatalog: boolean;
  boot: () => Promise<void>;
  lock: () => void;
  unlockWithPin: (pin: string) => Promise<{ ok: boolean; wait: number }>;
  unlockWithBio: () => Promise<boolean>;
  enablePin: (pin: string) => Promise<void>;
  changePin: (pin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  verifyCurrent: (pin: string) => Promise<boolean>;
  setPinFlow: (flow: PinFlow) => void;
  setQuery: (query: string) => void;
  setTier: (tier: TierFilter) => void;
  setFilters: (filters: Filters) => void;
  setSort: (sort: SortKey) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setAutoLock: (ms: number) => Promise<void>;
  openArchive: () => void;
  openCatalog: (tier: TierFilter) => void;
  openSearch: () => void;
  openSettings: () => void;
  openProfile: (id: string) => void;
  startCreate: () => void;
  startEdit: (id: string) => void;
  back: () => void;
  setFilterOpen: (open: boolean) => void;
  setSortOpen: (open: boolean) => void;
  setTierPickFor: (id: string | null) => void;
  ask: (confirm: ConfirmState | null) => void;
  assignTier: (id: string, tier: Tier) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  removeDemos: () => Promise<void>;
  removeAll: () => Promise<void>;
  saveEditor: (input: {
    id: string | null;
    name: string;
    age: number;
    height: number;
    city: string;
    telegram: string;
    tier: Tier;
    notes: string;
    photos: PhotoDraft[];
    originalIds: string[];
  }) => Promise<boolean>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;
  toggleBio: (on: boolean) => Promise<void>;
  setCovered: (covered: boolean) => void;
  setHomeCover: (file: File) => Promise<void>;
  resetHomeCover: () => Promise<void>;
  setCoverFocus: (x: number, y: number) => void;
  setMonoCatalog: (mono: boolean) => void;
};

export const useAurelle = create<AurelleState>((set, get) => ({
  booted: false,
  bootError: null,
  locked: false,
  encrypted: false,
  hasBio: false,
  covered: false,
  busy: null,
  toast: null,
  profiles: [],
  view: "archive",
  origin: "archive",
  profileId: null,
  editId: null,
  tier: "ALL",
  inCatalog: false,
  query: "",
  sort: "new",
  viewMode: "grid",
  filters: DEFAULT_FILTERS,
  filterOpen: false,
  sortOpen: false,
  tierPickFor: null,
  confirm: null,
  pinFlow: null,
  autoLockMs: 60_000,
  homeCover: null,
  coverX: DEFAULT_COVER.coverX,
  coverY: DEFAULT_COVER.coverY,
  monoCatalog: true,

  boot: () => {
    if (!bootPromise) {
      bootPromise = (async () => {
        try {
          const prefs = loadPrefs();
          const coverBlob = await getCover().catch(() => null);
          const homeCover = coverBlob ? URL.createObjectURL(coverBlob) : null;
          let meta = await getMeta();
          if (meta?.encrypted) {
            set({
              booted: true,
              locked: true,
              encrypted: true,
              hasBio: Boolean(meta.bioCredentialId),
              autoLockMs: meta.autoLockMs ?? 60_000,
              homeCover,
              ...prefs,
            });
            return;
          }
          if (!meta) {
            meta = { encrypted: false, seeded: false, autoLockMs: 60_000 };
            await putMeta(meta);
          }
          if (!meta.seeded) {
            const profiles = demoProfiles();
            for (const demo of DEMOS) primeThumb(demo.photoId, demo.photoUrl);
            set({
              booted: true,
              locked: false,
              encrypted: false,
              profiles,
              autoLockMs: meta.autoLockMs ?? 60_000,
              homeCover,
              ...prefs,
            });
            trackVaultTask(persistDemos(() => get().profiles));
            return;
          }
          const listed = await listProfiles();
          for (const demo of DEMOS) primeThumb(demo.photoId, demo.photoUrl);
          const profiles = await localizeDemos(await refreshDemoPhotos(listed));
          set({
            booted: true,
            locked: false,
            encrypted: false,
            profiles,
            autoLockMs: meta.autoLockMs ?? 60_000,
            homeCover,
            ...prefs,
            view: "archive",
            inCatalog: false,
            profileId: null,
          });
        } catch {
          set({ booted: true, bootError: "Could not open the local archive in this browser." });
        }
      })();
    }
    return bootPromise;
  },

  lock: () => {
    if (!get().encrypted) {
      set({ pinFlow: "create" });
      return;
    }
    lockSession();
    revokeAll();
    set({
      locked: true,
      covered: false,
      profiles: [],
      view: "archive",
      origin: "archive",
      profileId: null,
      editId: null,
      filterOpen: false,
      sortOpen: false,
      tierPickFor: null,
      confirm: null,
      pinFlow: null,
    });
  },

  unlockWithPin: async (pin) => {
    const until = Number(sessionStorage.getItem(UNTIL_KEY) || 0);
    const wait = Math.max(0, until - Date.now());
    if (wait > 0) return { ok: false, wait };
    const ok = await unlock(pin);
    if (!ok) {
      const fails = Number(sessionStorage.getItem(FAIL_KEY) || 0) + 1;
      if (fails >= 5) {
        sessionStorage.setItem(FAIL_KEY, "0");
        sessionStorage.setItem(UNTIL_KEY, String(Date.now() + 30_000));
        return { ok: false, wait: 30_000 };
      }
      sessionStorage.setItem(FAIL_KEY, String(fails));
      return { ok: false, wait: 0 };
    }
    sessionStorage.removeItem(FAIL_KEY);
    sessionStorage.removeItem(UNTIL_KEY);
    const profiles = await localizeDemos(await refreshDemoPhotos(await listProfiles()));
    const meta = await getMeta();
    set({
      locked: false,
      covered: false,
      profiles,
      encrypted: true,
      hasBio: Boolean(meta?.bioCredentialId),
      autoLockMs: meta?.autoLockMs ?? get().autoLockMs,
    });
    return { ok: true, wait: 0 };
  },

  unlockWithBio: async () => {
    set({ busy: "Waiting for confirmation…" });
    const key = await unlockWithBiometric();
    if (!key) {
      set({ busy: null, toast: "Biometrics did not work" });
      return false;
    }
    const ok = await adoptKey(key);
    if (!ok) {
      set({ busy: null, toast: "Could not open the archive" });
      return false;
    }
    const profiles = await localizeDemos(await refreshDemoPhotos(await listProfiles()));
    set({ busy: null, locked: false, covered: false, profiles });
    return true;
  },

  enablePin: async (pin) => {
    set({ busy: "Encrypting the archive…" });
    try {
      await vaultReady();
      await enablePin(pin);
      set({ busy: null, encrypted: true, pinFlow: null, toast: "Archive encrypted. PIN is on." });
    } catch (error) {
      set({ busy: null, toast: explain(error) });
    }
  },

  changePin: async (pin) => {
    set({ busy: "Changing the code…" });
    try {
      await vaultReady();
      await changePin(pin);
      set({ busy: null, hasBio: false, pinFlow: null, toast: "PIN updated. Turn biometrics on again." });
    } catch (error) {
      set({ busy: null, toast: explain(error) });
    }
  },

  disablePin: async () => {
    set({ busy: "Removing encryption…" });
    try {
      await vaultReady();
      await disablePin();
      set({ busy: null, encrypted: false, hasBio: false, pinFlow: null, toast: "Lock is off" });
    } catch (error) {
      set({ busy: null, toast: explain(error) });
    }
  },

  verifyCurrent: (pin) => verifyPin(pin),
  setPinFlow: (pinFlow) => set({ pinFlow }),
  setQuery: (query) => set({ query }),
  setTier: (tier) => set({ tier }),
  setFilters: (filters) => set({ filters }),
  setSort: (sort) => {
    savePrefs({ sort });
    set({ sort, sortOpen: false });
  },
  setViewMode: (viewMode) => {
    savePrefs({ viewMode });
    set({ viewMode });
  },
  setAutoLock: async (autoLockMs) => {
    await setAutoLock(autoLockMs);
    set({ autoLockMs });
  },
  openArchive: () => set({ view: "archive", origin: "archive", inCatalog: false }),
  openCatalog: (tier) => set({ view: "archive", origin: "archive", tier: tier ?? "ALL", inCatalog: true }),
  openSearch: () => set({ view: "search", origin: "search" }),
  openSettings: () => set({ view: "settings" }),
  openProfile: (id) => set((state) => ({ view: "profile", profileId: id, origin: state.view === "search" ? "search" : "archive" })),
  startCreate: () => set({ view: "edit", editId: null, filterOpen: false, sortOpen: false }),
  startEdit: (id) => set({ view: "edit", editId: id, profileId: id }),
  back: () =>
    set((state) => {
      if (state.view === "edit") {
        return state.editId
          ? { view: "profile" as const, profileId: state.editId }
          : { view: state.origin === "search" ? ("search" as const) : ("archive" as const) };
      }
      if (state.view === "profile") {
        return { view: state.origin === "search" ? ("search" as const) : ("archive" as const), profileId: null };
      }
      return { view: "archive" as const };
    }),
  setFilterOpen: (filterOpen) => set({ filterOpen }),
  setSortOpen: (sortOpen) => set({ sortOpen }),
  setTierPickFor: (tierPickFor) => set({ tierPickFor }),
  ask: (confirm) => set({ confirm }),

  assignTier: async (id, tier) => {
    const profile = get().profiles.find((item) => item.id === id);
    if (!profile || profile.tier === tier) {
      set({ tierPickFor: null });
      return;
    }
    const next = { ...profile, tier, updatedAt: Date.now() };
    try {
      await vaultReady();
      await saveProfile(next, [], []);
      set((state) => ({ profiles: upsert(state.profiles, next), tierPickFor: null }));
    } catch (error) {
      set({ toast: explain(error), tierPickFor: null });
    }
  },

  removeProfile: async (id) => {
    try {
      await vaultReady();
      await deleteProfile(id);
      set((state) => ({
        profiles: state.profiles.filter((profile) => profile.id !== id),
        confirm: null,
        view: state.profileId === id ? (state.origin === "search" ? "search" : "archive") : state.view,
        profileId: state.profileId === id ? null : state.profileId,
        toast: "Profile deleted",
      }));
    } catch (error) {
      set({ confirm: null, toast: explain(error) });
    }
  },

  removeDemos: async () => {
    const demos = get().profiles.filter((profile) => profile.demo);
    try {
      await vaultReady();
      for (const demo of demos) await deleteProfile(demo.id);
      set((state) => ({
        profiles: state.profiles.filter((profile) => !profile.demo),
        confirm: null,
        toast: "Sample profiles removed",
        view:
          state.profileId && demos.some((demo) => demo.id === state.profileId)
            ? "archive"
            : state.view,
        profileId:
          state.profileId && demos.some((demo) => demo.id === state.profileId) ? null : state.profileId,
      }));
    } catch (error) {
      set({ confirm: null, toast: explain(error) });
    }
  },

  removeAll: async () => {
    const ids = get().profiles.map((profile) => profile.id);
    try {
      await vaultReady();
      for (const id of ids) await deleteProfile(id);
      set({
        profiles: [],
        confirm: null,
        toast: "All profiles deleted",
        view: "archive",
        inCatalog: false,
        profileId: null,
        editId: null,
        query: "",
      });
    } catch (error) {
      set({ confirm: null, toast: explain(error) });
    }
  },

  saveEditor: async (input) => {
    set({ busy: "Saving the profile…" });
    try {
      await vaultReady();
      const existing = input.id ? get().profiles.find((profile) => profile.id === input.id) : undefined;
      const id = input.id ?? crypto.randomUUID();
      const made = new Map<string, { id: string; thumb: Blob; full: Blob }>();
      await Promise.all(
        input.photos.map(async (photo) => {
          if (!photo.file) return;
          const variants = await variantsFromFile(photo.file);
          made.set(photo.key, { id: crypto.randomUUID(), thumb: variants.thumb, full: variants.full });
        }),
      );
      const photoIds: string[] = [];
      const additions: { id: string; thumb: Blob; full: Blob }[] = [];
      for (const photo of input.photos) {
        if (photo.existingId) {
          photoIds.push(photo.existingId);
          continue;
        }
        const next = made.get(photo.key);
        if (!next) continue;
        photoIds.push(next.id);
        additions.push(next);
      }
      const removed = input.originalIds.filter((photoId) => !photoIds.includes(photoId));
      const profile: Profile = {
        id,
        name: input.name.trim(),
        age: input.age,
        height: input.height,
        city: input.city.trim(),
        telegram: telegramHandle(input.telegram),
        tier: input.tier,
        notes: input.notes.trim().slice(0, 4000),
        photoIds,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        demo: existing?.demo,
      };
      await saveProfile(profile, additions, removed);
      set((state) => ({
        busy: null,
        profiles: upsert(state.profiles, profile),
        view: "profile",
        profileId: id,
        editId: id,
        toast: "Profile saved",
      }));
      return true;
    } catch (error) {
      set({ busy: null, toast: explain(error) });
      return false;
    }
  },

  exportBackup: async () => {
    if (!get().encrypted) {
      set({ pinFlow: "create", toast: "Set a PIN. The backup is encrypted with it." });
      return;
    }
    set({ busy: "Building the backup…" });
    try {
      await vaultReady();
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "aurelle-backup.json";
      link.click();
      URL.revokeObjectURL(url);
      set({ busy: null, toast: "Encrypted backup saved" });
    } catch {
      set({ busy: null, toast: "Could not create the backup" });
    }
  },

  importBackup: async (file) => {
    set({ busy: "Reading the backup…" });
    try {
      const result = await importBackup(file);
      if (result.encrypted) {
        set({
          busy: null,
          encrypted: true,
          locked: true,
          hasBio: false,
          profiles: [],
          view: "archive",
          confirm: null,
          toast: "Backup restored. Enter its PIN.",
        });
        return;
      }
      const profiles = await listProfiles();
      set({
        busy: null,
        encrypted: false,
        locked: false,
        hasBio: false,
        profiles,
        confirm: null,
        toast: "Backup restored",
      });
    } catch {
      set({ busy: null, toast: "This file does not look like an AURELLE backup" });
    }
  },

  toggleBio: async (on) => {
    if (!on) {
      await clearBio();
      set({ hasBio: false, toast: "Biometrics are off" });
      return;
    }
    if (!get().encrypted) {
      set({ pinFlow: "create", toast: "Set a PIN first" });
      return;
    }
    const { enableBiometric } = await import("@/aurelle/bio");
    const { getSessionKey } = await import("@/aurelle/db");
    const key = getSessionKey();
    if (!key) {
      set({ toast: "Open the archive first" });
      return;
    }
    set({ busy: "Turning on biometrics…" });
    const result = await enableBiometric(key);
    if (result.ok) set({ busy: null, hasBio: true, toast: "Biometrics are on" });
    else set({ busy: null, hasBio: false, toast: result.reason });
  },

  setCovered: (covered) => set({ covered }),

  setHomeCover: async (file) => {
    set({ busy: "Saving the photo…" });
    try {
      const blob = await coverFromFile(file);
      await putCover(blob);
      const prev = get().homeCover;
      if (prev) URL.revokeObjectURL(prev);
      set({ busy: null, homeCover: URL.createObjectURL(blob), toast: "Home photo updated" });
    } catch (error) {
      set({ busy: null, toast: explain(error) });
    }
  },

  resetHomeCover: async () => {
    try {
      await putCover(null);
      const prev = get().homeCover;
      if (prev) URL.revokeObjectURL(prev);
      savePrefs(DEFAULT_COVER);
      set({ homeCover: null, ...DEFAULT_COVER, toast: "Original photo restored" });
    } catch (error) {
      set({ toast: explain(error) });
    }
  },

  setCoverFocus: (coverX, coverY) => {
    const next = {
      coverX: Math.min(100, Math.max(0, coverX)),
      coverY: Math.min(100, Math.max(0, coverY)),
    };
    savePrefs(next);
    set(next);
  },

  setMonoCatalog: (monoCatalog) => {
    savePrefs({ monoCatalog });
    set({ monoCatalog });
  },
}));
