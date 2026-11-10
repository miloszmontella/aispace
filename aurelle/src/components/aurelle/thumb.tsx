import { useEffect, useRef, useState } from "react";
import { ensureThumb, peekThumb } from "@/aurelle/db";

export function Thumb({ id, alt, position }: { id: string; alt: string; position?: string }) {
  const hold = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = hold.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [id]);

  useEffect(() => {
    if (!seen) return;
    const primed = peekThumb(id);
    if (primed) {
      setUrl(primed);
      return;
    }
    let live = true;
    ensureThumb(id)
      .then((next) => {
        if (live) setUrl(next);
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
    };
  }, [id, seen]);

  return (
    <span ref={hold} className="thumb-hold">
      {url ? (
        <img
          src={url}
          alt={alt}
          className={ready ? "ready" : undefined}
          onLoad={() => setReady(true)}
          decoding="async"
          style={position ? { objectPosition: position } : undefined}
        />
      ) : null}
    </span>
  );
}