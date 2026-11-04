import type { Mapping } from "@gooi/react";

/** The task page in shadcn: rules matched in order against the page's HTML,
 * the first match winning. Change this, then run `bun run compile`. */
export const shadcn: Mapping = {
  rules: [
    { match: "head > style", as: "link", props: { rel: "stylesheet", href: "/shadcn.css" } },
    { match: "body", as: "body", className: "min-h-screen antialiased" },
    { match: "main", as: "main", className: "mx-auto flex max-w-2xl flex-col gap-3 px-4 py-10" },
    { match: "h1", as: "h1", className: "text-3xl font-semibold tracking-tight" },
    { match: ".summary", as: "p", className: "text-muted-foreground" },
    {
      match: "h2",
      as: "h2",
      className: "mt-6 text-xs font-medium tracking-wider text-muted-foreground uppercase",
    },
    {
      match: "ul",
      as: "Card",
      from: "@/components/ui/card",
      className: "gap-0 overflow-hidden py-0",
    },
    {
      match: "li",
      as: "div",
      className:
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-5 py-3 last:border-b-0",
    },
    { match: "li.done .title", as: "span", className: "text-muted-foreground line-through" },
    { match: ".title", as: "span", className: "font-medium" },
    { match: ".problem", as: "span", className: "w-full text-sm text-destructive" },
    { match: "p.meta", as: "p", className: "text-sm text-muted-foreground" },
    { match: ".meta", as: "Badge", from: "@/components/ui/badge", props: { variant: "secondary" } },
    { match: "footer", as: "footer", className: "pt-6 text-sm text-muted-foreground" },
  ],
};
