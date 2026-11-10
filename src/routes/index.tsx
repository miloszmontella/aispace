import { createFileRoute } from "@tanstack/react-router";
import { AurelleApp } from "@/components/aurelle/app";
import { PRELOAD_PHOTOS } from "@/aurelle/demo";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    links: PRELOAD_PHOTOS.map((href) => ({ rel: "preload" as const, as: "image" as const, href })),
  }),
});

function Home() {
  return <AurelleApp />;
}
