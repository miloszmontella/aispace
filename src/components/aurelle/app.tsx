import { useEffect, useState } from "react";
import { Fingerprint, LayoutGrid, Plus, Search, Settings, SlidersHorizontal } from "lucide-react";
import still from "@/aurelle/photos/still.jpg";
import { filtersActive, tap } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";
import { ArchiveView } from "@/components/aurelle/archive-view";
import { EditorView } from "@/components/aurelle/editor-view";
import { HomeView } from "@/components/aurelle/home-view";
import { Overlays } from "@/components/aurelle/overlays";
import { PinPad } from "@/components/aurelle/pin-pad";
import { ProfileView } from "@/components/aurelle/profile-view";
import { SettingsView } from "@/components/aurelle/settings-view";

export function AurelleApp() {
  const booted = useAurelle((state) => state.booted);
  const bootError = useAurelle((state) => state.bootError);
  const locked = useAurelle((state) => state.locked);
  const encrypted = useAurelle((state) => state.encrypted);
  const autoLockMs = useAurelle((state) => state.autoLockMs);
  const view = useAurelle((state) => state.view);
  const inCatalog = useAurelle((state) => state.inCatalog);
  const hasBio = useAurelle((state) => state.hasBio);

  useEffect(() => {
    void useAurelle.getState().boot();
  }, [booted]);

  useEffect(() => {
    if (!booted) return;
    let idle = 0;
    let hiddenTimer = 0;
    const arm = () => {
      window.clearTimeout(idle);
      const state = useAurelle.getState();
      if (!state.encrypted || state.locked || !state.autoLockMs) return;
      idle = window.setTimeout(() => state.lock(), state.autoLockMs);
    };
    arm();
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", arm, opts);
    window.addEventListener("keydown", arm);
    window.addEventListener("scroll", arm, { capture: true, passive: true });
    const onVis = () => {
      const state = useAurelle.getState();
      if (!state.encrypted || state.locked) return;
      if (document.hidden) {
        state.setCovered(true);
        const wait = state.autoLockMs || 15_000;
        hiddenTimer = window.setTimeout(() => {
          if (document.hidden) useAurelle.getState().lock();
        }, Math.min(wait, 15_000));
      } else {
        window.clearTimeout(hiddenTimer);
        if (!useAurelle.getState().locked) useAurelle.getState().setCovered(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(idle);
      window.clearTimeout(hiddenTimer);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("scroll", arm, true);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [booted, encrypted, locked, autoLockMs]);

  return (
    <div className="app">
      {!booted ? <Splash /> : null}
      {booted && bootError ? (
        <div className="empty">
          <h2>Archive unavailable</h2>
          <p>{bootError}</p>
        </div>
      ) : null}
      {booted && !bootError && locked ? <LockScreen bio={hasBio} /> : null}
      {booted && !bootError && !locked ? (
        view === "edit" ? (
          <EditorView />
        ) : view === "archive" && !inCatalog ? (
          <>
            <HomeView />
            <Dock />
          </>
        ) : (
          <>
            <div className="scroll">
              {view === "profile" ? <ProfileView /> : null}
              {view === "settings" ? <SettingsView /> : null}
              {view === "archive" || view === "search" ? (
                <ArchiveView mode={view === "search" ? "search" : "archive"} />
              ) : null}
            </div>
            {view === "archive" || view === "search" || view === "settings" ? <Dock /> : null}
          </>
        )
      ) : null}
      <Overlays />
    </div>
  );
}

function Splash() {
  return (
    <div className="splash">
      <img className="splash-bg" src={still} alt="" />
      <div className="splash-shade" />
      <div className="splash-body">
        <p className="wordmark">Aurelle</p>
        <p className="kicker">Private Archive</p>
        <h1 className="display">
          My
          <br />
          archive
        </h1>
      </div>
    </div>
  );
}

function LockScreen({ bio }: { bio: boolean }) {
  const unlockWithPin = useAurelle((state) => state.unlockWithPin);
  const unlockWithBio = useAurelle((state) => state.unlockWithBio);
  const busy = useAurelle((state) => state.busy);
  const [error, setError] = useState<string | null>(null);
  const [errorId, setErrorId] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  async function submit(pin: string) {
    const result = await unlockWithPin(pin);
    if (result.ok) return;
    if (result.wait > 0) {
      setError("Too many attempts. Wait half a minute.");
    } else {
      setError("Wrong PIN");
    }
    setErrorId((value) => value + 1);
    setResetKey((value) => value + 1);
  }

  return (
    <div className="lock">
      <img className="lock-bg" src={still} alt="" />
      <div className="lock-shade" />
      <div className="lock-body">
        <p className="wordmark">Aurelle</p>
        <p className="kicker">Private Archive</p>
        <h1 className="display lock-title">
          Archive
          <br />
          locked
        </h1>
        <PinPad resetKey={resetKey} errorId={errorId} error={error} disabled={Boolean(busy)} onSubmit={(pin) => void submit(pin)} />
        {bio ? (
          <button type="button" className="btn-block" onClick={() => void unlockWithBio()}>
            <Fingerprint size={16} strokeWidth={1.5} /> Biometrics
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Dock() {
  const view = useAurelle((state) => state.view);
  const inCatalog = useAurelle((state) => state.inCatalog);
  const filterOpen = useAurelle((state) => state.filterOpen);
  const filters = useAurelle((state) => state.filters);
  const openArchive = useAurelle((state) => state.openArchive);
  const openSearch = useAurelle((state) => state.openSearch);
  const openSettings = useAurelle((state) => state.openSettings);
  const startCreate = useAurelle((state) => state.startCreate);
  const setFilterOpen = useAurelle((state) => state.setFilterOpen);
  const archiveOn = view === "archive" && !inCatalog;

  return (
    <nav className="dock" aria-label="Sections">
      <button type="button" className={archiveOn ? "dock-btn on" : "dock-btn"} onClick={() => { tap(6); openArchive(); }}>
        <LayoutGrid size={18} strokeWidth={1.5} />
        Archive
      </button>
      <button type="button" className={view === "search" ? "dock-btn on" : "dock-btn"} onClick={() => { tap(6); openSearch(); }}>
        <Search size={18} strokeWidth={1.5} />
        Search
      </button>
      <button type="button" className="dock-btn dock-add" aria-label="Add profile" onClick={() => { tap(12); startCreate(); }}>
        <span className="plus">
          <Plus size={20} strokeWidth={1.6} />
        </span>
      </button>
      <button
        type="button"
        className={filterOpen ? "dock-btn on" : "dock-btn"}
        onClick={() => { tap(6); setFilterOpen(true); }}
      >
        <span className="dock-ico">
          <SlidersHorizontal size={18} strokeWidth={1.5} />
          {filtersActive(filters) ? <i className="dock-dot" /> : null}
        </span>
        Filters
      </button>
      <button type="button" className={view === "settings" ? "dock-btn on" : "dock-btn"} onClick={() => { tap(6); openSettings(); }}>
        <Settings size={18} strokeWidth={1.5} />
        Settings
      </button>
    </nav>
  );
}
