import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import { useAurelle } from "@/aurelle/store";
import { AurelleApp } from "@/components/aurelle/app";
import "@/styles.css";

type BackFn = () => boolean;

declare global {
  interface Window {
    aurelleHardwareBack?: () => boolean;
    aurellePushBack?: (fn: BackFn) => () => void;
  }
}

const handlers: BackFn[] = [];

window.aurellePushBack = (fn) => {
  handlers.push(fn);
  return () => {
    const index = handlers.indexOf(fn);
    if (index >= 0) handlers.splice(index, 1);
  };
};

window.aurelleHardwareBack = () => {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    if (handlers[index]()) return true;
  }
  const state = useAurelle.getState();
  if (state.confirm) {
    state.ask(null);
    return true;
  }
  if (state.pinFlow) {
    state.setPinFlow(null);
    return true;
  }
  if (state.filterOpen) {
    state.setFilterOpen(false);
    return true;
  }
  if (state.sortOpen) {
    state.setSortOpen(false);
    return true;
  }
  if (state.tierPickFor) {
    state.setTierPickFor(null);
    return true;
  }
  if (!state.booted || state.locked || state.bootError) return false;
  if (state.view === "archive" && !state.inCatalog) return false;
  if (state.view === "archive" && state.inCatalog) {
    state.openArchive();
    return true;
  }
  state.back();
  return true;
};

document.documentElement.dataset.native = "1";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AurelleApp />
    </StrictMode>,
  );
}
