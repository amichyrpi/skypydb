import { useLocation } from "@docusaurus/router";
import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * localStorage key used to persist the user's framework selection across
 * page reloads and sessions.
 */
const STORAGE_KEY = "mesosphere-framework";

/**
 * Maps each framework ID to the Docusaurus doc ID of its quickstart page.
 * The doc ID is the file path relative to the docs root, without the extension.
 * Note: expo reuses the react-native quickstart file.
 */
const QUICKSTART_DOC_ID: Record<string, string> = {
  nextjs: "quickstart/nextjs",
  react: "quickstart/react",
  tanstack: "quickstart/tanstack-start",
  node: "quickstart/nodejs",
  bun: "quickstart/bun",
  deno: "quickstart/deno",
  hono: "quickstart/hono",
  svelte: "quickstart/svelte",
  remix: "quickstart/remix",
  expo: "quickstart/react-native",
  vue: "quickstart/vue",
  nuxt: "quickstart/nuxt",
  python: "quickstart/python",
  rust: "quickstart/rust",
  js: "quickstart/javascript",
  "script-tag": "quickstart/script-tag",
};

/**
 * Maps each framework ID to the sidebar className of its client library entry.
 * A null value means no client library exists for that framework.
 * Frameworks that share a client library (e.g. node, bun, js) all point to
 * the same className.
 */
const CLIENT_LIB_CLASS: Record<string, string | null> = {
  nextjs: "mesosphere-sidebar-nextjs",
  react: "mesosphere-sidebar-react",
  tanstack: "mesosphere-sidebar-tanstack",
  node: "mesosphere-sidebar-javascript",
  bun: "mesosphere-sidebar-javascript",
  deno: "mesosphere-sidebar-deno",
  hono: "mesosphere-sidebar-hono",
  svelte: "mesosphere-sidebar-svelte",
  remix: "mesosphere-sidebar-react",
  expo: "mesosphere-sidebar-react-native",
  vue: "mesosphere-sidebar-vue",
  nuxt: "mesosphere-sidebar-nuxt",
  python: "mesosphere-sidebar-python",
  rust: "mesosphere-sidebar-rust",
  js: "mesosphere-sidebar-javascript",
  "script-tag": "mesosphere-sidebar-javascript",
};

/**
 * Reverse lookup derived from QUICKSTART_DOC_ID.
 * Maps a quickstart URL slug (e.g. "react-native") to its framework ID
 * (e.g. "expo"), so we can detect the framework when the user navigates
 * directly to a quickstart URL.
 */
const QUICKSTART_SLUG_TO_FRAMEWORK: Record<string, string> = Object.fromEntries(
  Object.entries(QUICKSTART_DOC_ID).map(([fw, docId]) => [
    docId.replace("quickstart/", ""),
    fw,
  ]),
);

/**
 * Maps client library URL path segments to framework IDs.
 * Used to detect the framework when the user navigates to a client library
 * page (e.g. visiting /docs/client/react/... selects the "react" framework).
 */
const CLIENT_PATH_TO_FRAMEWORK: Record<string, string> = {
  "client/nextjs": "nextjs",
  "client/react-native": "expo",
  "client/react": "react",
  "client/tanstack": "tanstack",
  "client/javascript": "node",
  "client/vue": "vue",
  "client/nuxt": "nuxt",
  "client/svelte": "svelte",
  "client/python": "python",
  "client/rust": "rust",
  "client/deno": "deno",
  "client/hono": "hono",
};

/**
 * Infers the active framework from a URL pathname.
 * Checks quickstart paths first, then client library paths.
 * Returns null if the path does not belong to any known framework.
 */
function frameworkFromPath(pathname: string): string | null {
  const quickstartMatch = pathname.match(/\/quickstart\/([^/]+)/);
  if (quickstartMatch) {
    return QUICKSTART_SLUG_TO_FRAMEWORK[quickstartMatch[1]] ?? null;
  }
  for (const [segment, fw] of Object.entries(CLIENT_PATH_TO_FRAMEWORK)) {
    if (pathname.includes(`/${segment}`)) return fw;
  }
  return null;
}

/**
 * The set of all sidebar classNames that belong to client library entries.
 * Used by filterSidebar to determine which sidebar items should be hidden
 * when they do not match the selected framework.
 */
const ALL_CLIENT_LIB_CLASSES = new Set([
  "mesosphere-sidebar-react",
  "mesosphere-sidebar-nextjs",
  "mesosphere-sidebar-tanstack",
  "mesosphere-sidebar-react-native",
  "mesosphere-sidebar-javascript",
  "mesosphere-sidebar-vue",
  "mesosphere-sidebar-nuxt",
  "mesosphere-sidebar-svelte",
  "mesosphere-sidebar-python",
  "mesosphere-sidebar-rust",
  "mesosphere-sidebar-deno",
  "mesosphere-sidebar-hono",
]);

/** Returns true if the item's className string contains the given class. */
function hasClass(className: string | undefined, cls: string): boolean {
  return className?.split(" ").includes(cls) ?? false;
}

/** Returns true if the sidebar item is a client library entry. */
function isClientLibItem(item: any): boolean {
  return (
    item.className
      ?.split(" ")
      .some((c: string) => ALL_CLIENT_LIB_CLASSES.has(c)) ?? false
  );
}

/**
 * Filters a Docusaurus sidebar array to show only the items relevant to the
 * selected framework:
 *
 * - The Quickstarts category is replaced by the single matching quickstart
 *   item, placed directly in the sidebar (no folder wrapper) and labelled
 *   "X Quickstart".
 * - All client library items are hidden except the one whose sidebar className
 *   matches the selected framework.
 * - All other items are left untouched.
 */
export function filterSidebar(sidebar: any[], framework: string): any[] {
  const targetQuickstart = QUICKSTART_DOC_ID[framework];
  const targetClientClass = CLIENT_LIB_CLASS[framework];

  return sidebar.reduce((acc: any[], item: any) => {
    // Quickstarts category: pull the matching child out of the folder and
    // label it "X Quickstart" so it appears as a plain link in the sidebar.
    if (
      hasClass(item.className, "mesosphere-sidebar-quickstart") &&
      item.items
    ) {
      if (targetQuickstart) {
        const match = item.items.find(
          (child: any) =>
            child.docId === targetQuickstart ||
            child.href?.endsWith(`/${targetQuickstart}`),
        );
        if (match) {
          acc.push({ ...match, label: `${match.label} Quickstart` });
        }
      }
      return acc;
    }

    // Client library section: keep only the entry that matches the selected
    // framework; all others are hidden.
    if (isClientLibItem(item)) {
      if (targetClientClass && hasClass(item.className, targetClientClass)) {
        acc.push(item);
      }
      return acc;
    }

    acc.push(item);
    return acc;
  }, []);
}

interface FrameworkContextValue {
  selectedFramework: string;
  setSelectedFramework: (fw: string) => void;
}

const FrameworkContext = createContext<FrameworkContextValue>({
  selectedFramework: "nextjs",
  setSelectedFramework: () => {},
});

/**
 * Provides the selected framework to the entire app.
 *
 * On mount it restores the last selection from localStorage.
 * On every navigation it checks whether the new URL belongs to a known
 * framework page and, if so, updates the selection automatically so the
 * dropdown always reflects the page the user is currently reading.
 */
export function FrameworkProvider({ children }: { children: React.ReactNode }) {
  const [selectedFramework, setSelectedFrameworkState] =
    useState<string>("nextjs");
  const { pathname } = useLocation();

  // Restore the persisted selection after the first client-side render.
  // Runs only once — avoids SSR hydration mismatch.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedFrameworkState(stored);
  }, []);

  // Whenever the URL changes, check if it belongs to a framework-specific page.
  // If it does, update the selector and persist the new value.
  useEffect(() => {
    const detected = frameworkFromPath(pathname);
    if (detected) {
      setSelectedFrameworkState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
    }
  }, [pathname]);

  function setSelectedFramework(fw: string) {
    setSelectedFrameworkState(fw);
    localStorage.setItem(STORAGE_KEY, fw);
  }

  return (
    <FrameworkContext.Provider
      value={{ selectedFramework, setSelectedFramework }}
    >
      {children}
    </FrameworkContext.Provider>
  );
}

/** Hook to read and set the currently selected framework from any component. */
export function useFramework() {
  return useContext(FrameworkContext);
}
