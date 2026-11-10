import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Switch from "@radix-ui/react-switch";
import { Archive, ChevronLeft, ChevronRight, Download, Info, Shield, SlidersHorizontal, Smartphone, Upload, X } from "lucide-react";
import cover from "@/aurelle/photos/home.jpg";
import { tap } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";

const LOCKS = [
  { ms: 30_000, label: "30 seconds" },
  { ms: 60_000, label: "1 minute" },
  { ms: 300_000, label: "5 minutes" },
  { ms: 0, label: "Never lock" },
];

type Panel = "security" | "backup" | "look" | "about" | null;

export function SettingsView() {
  const encrypted = useAurelle((state) => state.encrypted);
  const hasBio = useAurelle((state) => state.hasBio);
  const autoLockMs = useAurelle((state) => state.autoLockMs);
  const profiles = useAurelle((state) => state.profiles);
  const setPinFlow = useAurelle((state) => state.setPinFlow);
  const setAutoLock = useAurelle((state) => state.setAutoLock);
  const toggleBio = useAurelle((state) => state.toggleBio);
  const exportBackup = useAurelle((state) => state.exportBackup);
  const importBackup = useAurelle((state) => state.importBackup);
  const lock = useAurelle((state) => state.lock);
  const ask = useAurelle((state) => state.ask);
  const removeDemos = useAurelle((state) => state.removeDemos);
  const removeAll = useAurelle((state) => state.removeAll);
  const openArchive = useAurelle((state) => state.openArchive);
  const homeCover = useAurelle((state) => state.homeCover);
  const coverX = useAurelle((state) => state.coverX);
  const coverY = useAurelle((state) => state.coverY);
  const setHomeCover = useAurelle((state) => state.setHomeCover);
  const resetHomeCover = useAurelle((state) => state.resetHomeCover);
  const setCoverFocus = useAurelle((state) => state.setCoverFocus);
  const monoCatalog = useAurelle((state) => state.monoCatalog);
  const setMonoCatalog = useAurelle((state) => state.setMonoCatalog);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [showApk, setShowApk] = useState(false);
  useEffect(() => {
    setShowApk(document.documentElement.dataset.native !== "1");
  }, []);

  useEffect(() => {
    if (!panel) return;
    return window.aurellePushBack?.(() => {
      setPanel(null);
      return true;
    });
  }, [panel]);

  const hasDemo = profiles.some((profile) => profile.demo);
  const lockLabel = LOCKS.find((item) => item.ms === autoLockMs)?.label ?? "1 minute";
  const frame = typeof document === "undefined" ? null : document.querySelector(".app");

  const sheet = panel ? (
    <div className="backdrop" onClick={() => setPanel(null)}>
      <div className="sheet set-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>
            {panel === "security" ? "Security" : null}
            {panel === "backup" ? "Backup" : null}
            {panel === "look" ? "Appearance" : null}
            {panel === "about" ? "About" : null}
          </h2>
          <button type="button" className="ghost" aria-label="Close" onClick={() => setPanel(null)}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {panel === "security" ? (
          <>
            <button type="button" className="set-row" onClick={() => setPinFlow(encrypted ? "change" : "create")}>
              <span className="set-copy">
                <strong>{encrypted ? "Change PIN" : "Set a PIN"}</strong>
                <em>{encrypted ? "A code is already on" : "Encrypts the archive on this device"}</em>
              </span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            {encrypted ? (
              <button type="button" className="set-row" onClick={() => setPinFlow("disable")}>
                <span className="set-copy">
                  <strong>Turn off the lock</strong>
                  <em>Removes encryption on this device</em>
                </span>
              </button>
            ) : null}
            <p className="field-label">Auto-lock</p>
            <p className="hint">{encrypted ? lockLabel : "Available after a PIN"}</p>
            <div className="choices">
              {LOCKS.map((item) => (
                <button
                  key={item.ms}
                  type="button"
                  className={autoLockMs === item.ms ? "on" : undefined}
                  disabled={!encrypted}
                  onClick={() => void setAutoLock(item.ms)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {panel === "backup" ? (
          <>
            <button type="button" className="set-row" onClick={() => void exportBackup()}>
              <span className="set-ico"><Download size={16} strokeWidth={1.5} /></span>
              <span className="set-copy">
                <strong>Export backup</strong>
                <em>An encrypted file, only for you</em>
              </span>
            </button>
            <button type="button" className="set-row" onClick={() => fileRef.current?.click()}>
              <span className="set-ico"><Upload size={16} strokeWidth={1.5} /></span>
              <span className="set-copy">
                <strong>Import backup</strong>
                <em>Replaces the current archive</em>
              </span>
            </button>
          </>
        ) : null}
        {panel === "look" ? (
          <>
            <p className="hint">The archive theme is always dark.</p>
            <button type="button" className="set-row" onClick={() => coverRef.current?.click()}>
              <span className="set-copy">
                <strong>Home photo</strong>
                <em>Drag the frame to choose the crop</em>
              </span>
            </button>
            <div className="cover-edit">
              <div
                className="cover-frame"
                onPointerDown={(event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  const originX = event.clientX;
                  const originY = event.clientY;
                  const start = draft ?? { x: coverX, y: coverY };
                  let next = start;
                  setDraft(start);
                  const move = (ev: PointerEvent) => {
                    const dx = ((ev.clientX - originX) / box.width) * 70;
                    const dy = ((ev.clientY - originY) / box.height) * 70;
                    next = {
                      x: Math.min(100, Math.max(0, start.x - dx)),
                      y: Math.min(100, Math.max(0, start.y - dy)),
                    };
                    setDraft(next);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                    setCoverFocus(next.x, next.y);
                    setDraft(null);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
              >
                <img
                  src={homeCover ?? cover}
                  alt=""
                  style={{ objectPosition: `${(draft ?? { x: coverX }).x}% ${(draft ?? { y: coverY }).y}%` }}
                />
              </div>
              <div className="cover-actions">
                <p>The crop is saved on this device.</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    tap();
                    setDraft(null);
                    void resetHomeCover();
                  }}
                >
                  Original photo
                </button>
              </div>
            </div>
            <p className="field-label">Catalog photos</p>
            <div className="choices">
              <button type="button" className={monoCatalog ? "on" : undefined} onClick={() => setMonoCatalog(true)}>
                Black and white
              </button>
              <button type="button" className={monoCatalog ? undefined : "on"} onClick={() => setMonoCatalog(false)}>
                Color
              </button>
            </div>
          </>
        ) : null}
        {panel === "about" ? (
          <>
            <p className="notes">
              AURELLE keeps profiles and photos only on this device. Nothing is sent to a server. After a PIN the archive is encrypted in the browser. Add only adults whose details you are allowed to keep.
            </p>
            {hasDemo ? (
              <button
                type="button"
                className="btn-block"
                onClick={() =>
                  ask({
                    title: "Delete the sample profiles?",
                    body: "Only profiles you added yourself will remain.",
                    confirm: "Delete samples",
                    danger: true,
                    run: () => removeDemos(),
                  })
                }
              >
                Delete sample profiles
              </button>
            ) : null}
            {profiles.length > 0 ? (
              <button
                type="button"
                className="btn-block danger"
                onClick={() =>
                  ask({
                    title: "Delete all profiles?",
                    body: "Every profile and photo on this device will be deleted. This cannot be undone.",
                    confirm: "Delete all",
                    danger: true,
                    run: () => removeAll(),
                  })
                }
              >
                Delete all profiles
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="settings">
      <header className="set-head">
        <button type="button" className="ghost" aria-label="Back" onClick={() => { tap(); openArchive(); }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h1>Settings</h1>
        <span />
      </header>
      <div className="brand-block">
        <div className="mono" aria-hidden="true">A</div>
        <div className="brand-copy">
          <strong>AURELLE</strong>
          <em>Private Archive</em>
          <p>Version 1.0.41</p>
        </div>
      </div>
      <div className="set-row">
        <span className="set-ico"><Shield size={16} strokeWidth={1.5} /></span>
        <button type="button" className="set-copy" onClick={() => setPanel("security")}>
          <strong>Security</strong>
          <em>Biometrics, PIN</em>
        </button>
        <Switch.Root
          className="sw"
          checked={hasBio}
          aria-label="Biometrics"
          onCheckedChange={(checked) => void toggleBio(checked)}
        >
          <Switch.Thumb className="sw-thumb" />
        </Switch.Root>
      </div>
      <button type="button" className="set-row" onClick={() => setPanel("backup")}>
        <span className="set-ico"><Archive size={16} strokeWidth={1.5} /></span>
        <span className="set-copy">
          <strong>Backup</strong>
          <em>Export and import</em>
        </span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
      <button type="button" className="set-row" onClick={() => setPanel("look")}>
        <span className="set-ico"><SlidersHorizontal size={16} strokeWidth={1.5} /></span>
        <span className="set-copy">
          <strong>Appearance</strong>
          <em>Dark theme</em>
        </span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
      <button type="button" className="set-row" onClick={() => setPanel("about")}>
        <span className="set-ico"><Info size={16} strokeWidth={1.5} /></span>
        <span className="set-copy">
          <strong>About</strong>
          <em>Information</em>
        </span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
      {showApk ? (
        <section className="install-apk">
          <div className="set-row">
            <span className="set-ico"><Smartphone size={16} strokeWidth={1.5} /></span>
            <span className="set-copy">
              <strong>Install on a phone</strong>
              <em>Android APK file</em>
            </span>
          </div>
          <a className="btn-block primary" href="/aurelle.apk" download="AURELLE.apk">
            Download APK
          </a>
          <p className="hint">
            Open the file on your phone and allow installation from the browser. The archive stays on this device only.
          </p>
        </section>
      ) : null}
      <button type="button" className="set-lock" onClick={() => { tap(); lock(); }}>
        Lock the app
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          ask({
            title: "Replace the archive?",
            body: "Profiles on this device will be replaced by the backup.",
            confirm: "Import",
            danger: true,
            run: () => importBackup(file),
          });
        }}
      />
      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void setHomeCover(file);
        }}
      />
      {sheet && frame ? createPortal(sheet, frame) : sheet}
    </div>
  );
}
