import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, MoreHorizontal, X } from "lucide-react";
import { ensureFull, ensureThumb, peekThumb } from "@/aurelle/db";
import { heightLabel, tap, telegramHref } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";

const FOCUS: Record<string, string> = {
  "demo-anastasia-p2": "50% 16%",
  "demo-sofia-p2": "50% 18%",
  "demo-maria-p2": "50% 22%",
  "demo-ekaterina-p2": "48% 18%",
  "demo-victoria-p2": "52% 14%",
  "demo-darya-p2": "50% 20%",
  "demo-ksenia-p2": "50% 18%",
  "demo-alina-p2": "50% 18%",
  "demo-polina-p2": "50% 15%",
};

function focusFor(id: string): string {
  return FOCUS[id] ?? "center 18%";
}

export function ProfileView() {
  const profileId = useAurelle((state) => state.profileId);
  const profile = useAurelle((state) => state.profiles.find((item) => item.id === profileId));
  const monoCatalog = useAurelle((state) => state.monoCatalog);
  const back = useAurelle((state) => state.back);
  const startEdit = useAurelle((state) => state.startEdit);
  const setTierPickFor = useAurelle((state) => state.setTierPickFor);
  const ask = useAurelle((state) => state.ask);
  const removeProfile = useAurelle((state) => state.removeProfile);
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [viewer, setViewer] = useState(false);
  const zoomRef = useRef({ scale: 1, x: 0, y: 0 });
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ scale: 1, dist: 1, x: 0, y: 0, mode: "none" as "none" | "pan" | "pinch" | "swipe", startX: 0, startY: 0, lastTap: 0 });

  const photoId = profile?.photoIds[index];

  useEffect(() => {
    setIndex(0);
    setViewer(false);
    setMenu(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    const reset = { scale: 1, x: 0, y: 0 };
    zoomRef.current = reset;
    setZoom(reset);
    const cached = peekThumb(photoId);
    if (cached) setUrl(cached);
    let live = true;
    const show = async () => {
      const thumb = cached ?? (await ensureThumb(photoId).catch(() => null));
      if (live && thumb) setUrl(thumb);
      try {
        const full = await ensureFull(photoId);
        if (!live || full === thumb) return;
        const ok = await new Promise<boolean>((resolve) => {
          const probe = new Image();
          probe.onload = () => resolve(probe.naturalWidth > 0);
          probe.onerror = () => resolve(false);
          probe.src = full;
        });
        if (live && ok) setUrl(full);
        else if (live && thumb) setUrl(thumb);
      } catch {
        if (live && thumb) setUrl(thumb);
        else if (live) setUrl(null);
      }
    };
    void show();
    return () => {
      live = false;
    };
  }, [photoId]);

  if (!profile) {
    return (
      <div className="empty">
        <h2>Profile not found</h2>
        <button type="button" className="btn-block" onClick={back}>
          Back
        </button>
      </div>
    );
  }

  const total = profile.photoIds.length;
  const href = telegramHref(profile.telegram, profile.demo);
  const position = photoId ? focusFor(photoId) : "center 18%";
  const frame = document.querySelector(".app");

  function swipe(delta: number) {
    if (total < 2) return;
    setIndex((current) => (current + delta + total) % total);
    tap(6);
  }

  function onSwipeStart(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    const openOnTap = target.classList.contains("dossier-hero");
    target.setPointerCapture?.(pointerId);
    const finish = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (total > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) swipe(-1);
        else swipe(1);
      } else if (openOnTap && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        setViewer(true);
      }
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
    };
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  }

  function commitZoom(next: { scale: number; x: number; y: number }) {
    const scale = Math.min(4, Math.max(1, next.scale));
    const limitX = ((scale - 1) * window.innerWidth) / 2;
    const limitY = ((scale - 1) * window.innerHeight) / 2;
    const value = {
      scale,
      x: scale <= 1 ? 0 : Math.min(limitX, Math.max(-limitX, next.x)),
      y: scale <= 1 ? 0 : Math.min(limitY, Math.max(-limitY, next.y)),
    };
    zoomRef.current = value;
    setZoom(value);
  }

  function onViewerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      pinch.current = {
        ...pinch.current,
        mode: "pinch",
        scale: zoomRef.current.scale,
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        x: zoomRef.current.x,
        y: zoomRef.current.y,
      };
      return;
    }
    pinch.current = {
      ...pinch.current,
      mode: zoomRef.current.scale > 1 ? "pan" : "swipe",
      startX: event.clientX,
      startY: event.clientY,
      x: zoomRef.current.x,
      y: zoomRef.current.y,
    };
  }

  function onViewerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];
    if (pinch.current.mode === "pinch" && pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      commitZoom({ scale: pinch.current.scale * (dist / pinch.current.dist), x: pinch.current.x, y: pinch.current.y });
      return;
    }
    if (pinch.current.mode === "pan") {
      commitZoom({
        scale: zoomRef.current.scale,
        x: pinch.current.x + (event.clientX - pinch.current.startX),
        y: pinch.current.y + (event.clientY - pinch.current.startY),
      });
    }
  }

  function onViewerUp(event: ReactPointerEvent<HTMLElement>) {
    const was = pinch.current.mode;
    pointers.current.delete(event.pointerId);
    if (was === "swipe" || was === "pan") {
      const dx = event.clientX - pinch.current.startX;
      const dy = event.clientY - pinch.current.startY;
      if (was === "swipe" && total > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) swipe(-1);
        else swipe(1);
      } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        const now = Date.now();
        if (now - pinch.current.lastTap < 280) {
          commitZoom(zoomRef.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 });
          pinch.current.lastTap = 0;
        } else {
          pinch.current.lastTap = now;
        }
      }
    }
    if (pointers.current.size < 2 && was === "pinch") pinch.current.mode = zoomRef.current.scale > 1 ? "pan" : "none";
    if (pointers.current.size === 0) pinch.current.mode = "none";
  }

  const viewerNode = viewer ? (
    <div className="viewer" onPointerDown={onViewerDown} onPointerMove={onViewerMove} onPointerUp={onViewerUp} onPointerCancel={onViewerUp}>
      {url ? (
        <img
          src={url}
          alt=""
          className={monoCatalog ? "is-mono" : undefined}
          style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }}
        />
      ) : null}
      <button type="button" className="glass viewer-close" aria-label="Close" onClick={() => setViewer(false)}>
        <X size={18} strokeWidth={1.5} />
      </button>
      {total > 1 ? (
        <p className="viewer-count">
          {index + 1} / {total}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <article className={monoCatalog ? "dossier is-mono" : "dossier"}>
      <section className="dossier-hero" onPointerDown={onSwipeStart}>
        {url ? (
          <img
            src={url}
            alt=""
            style={{ objectPosition: position }}
            className={monoCatalog ? "is-mono" : undefined}
            onError={() => {
              const thumb = photoId ? peekThumb(photoId) : null;
              if (thumb && thumb !== url) setUrl(thumb);
            }}
          />
        ) : null}
        <div className="dossier-shade" />
        {total > 1 ? (
          <p className="hero-count">
            {index + 1} / {total}
          </p>
        ) : null}
        <button type="button" className="glass dossier-back" aria-label="Back" onClick={() => { tap(); back(); }}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="dossier-tools">
          <button
            type="button"
            className="glass"
            aria-label="Menu"
            aria-expanded={menu}
            onClick={() => {
              tap();
              setMenu((open) => !open);
            }}
          >
            <MoreHorizontal size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="dossier-caption">
          <h1>{profile.name}</h1>
          <p>
            {profile.age} · {heightLabel(profile.height)} · {profile.city}
          </p>
        </div>
      </section>
      <section className="dossier-body">
        <p className="section-label">Details</p>
        <div className="kv">
          <span>Telegram</span>
          {href ? (
            <a className="link" href={href} target="_blank" rel="noreferrer">
              @{profile.telegram}
            </a>
          ) : (
            <strong>{profile.telegram ? `@${profile.telegram}` : "—"}</strong>
          )}
        </div>
        <div className="kv">
          <span>City</span>
          <strong>{profile.city}</strong>
        </div>
        <div className="kv">
          <span>Age</span>
          <strong>{profile.age}</strong>
        </div>
        <div className="kv">
          <span>Height</span>
          <strong>{heightLabel(profile.height)}</strong>
        </div>
        <p className="section-label">My notes</p>
        <p className="notes">{profile.notes.trim() || "No notes yet."}</p>
        <div className="dossier-actions">
          <button type="button" className="btn" onClick={() => { tap(); startEdit(profile.id); }}>
            Edit
          </button>
          <button type="button" className="btn" onClick={() => { tap(); setTierPickFor(profile.id); }}>
            Change tier
          </button>
          <button
            type="button"
            className="btn-block danger"
            onClick={() => {
              tap();
              ask({
                title: "Delete profile?",
                body: `“${profile.name}” and the photos will be deleted from this device and cannot be restored.`,
                confirm: "Delete",
                danger: true,
                run: () => removeProfile(profile.id),
              });
            }}
          >
            Delete
          </button>
        </div>
      </section>
      {menu ? (
        <button type="button" className="menu-catch" aria-label="Close menu" onClick={() => setMenu(false)} />
      ) : null}
      {menu ? (
        <div className="menu dossier-menu">
          <button
            type="button"
            className="danger"
            onClick={() => {
              setMenu(false);
              ask({
                title: "Delete profile?",
                body: `“${profile.name}” and the photos will be deleted from this device and cannot be restored.`,
                confirm: "Delete",
                danger: true,
                run: () => removeProfile(profile.id),
              });
            }}
          >
            Delete profile
          </button>
        </div>
      ) : null}
      {viewer && frame ? createPortal(viewerNode, frame) : viewerNode}
    </article>
  );
}
