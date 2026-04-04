import useBaseUrl from "@docusaurus/useBaseUrl";
import { useFramework } from "@site/src/context/FrameworkContext";
import React, { useEffect, useRef, useState } from "react";

/** A single framework option shown in the dropdown. */
interface Framework {
  id: string;
  name: string;
  logo: string;
  /** Extra CSS classes applied to the logo <img>, e.g. for theme-based inversion. */
  imgClass?: string;
}

/** A labeled group of framework options rendered as a section in the dropdown. */
interface FrameworkGroup {
  label: string;
  frameworks: Framework[];
}

/**
 * All available frameworks, organized into display groups.
 * The order within each group determines the order in the dropdown.
 * IDs must match the keys in FrameworkContext (QUICKSTART_DOC_ID, CLIENT_LIB_CLASS).
 */
const FRAMEWORK_GROUPS: FrameworkGroup[] = [
  {
    label: "Most Popular",
    frameworks: [
      {
        id: "nextjs",
        name: "Next.js",
        logo: "nextjs.svg",
        imgClass: "dark:invert",
      },
      { id: "react", name: "React", logo: "react.svg" },
      { id: "tanstack", name: "TanStack", logo: "tanstack.svg" },
    ],
  },
  {
    label: "Other Frameworks",
    frameworks: [
      { id: "node", name: "Node.js", logo: "node.svg" },
      { id: "bun", name: "Bun", logo: "bun.svg" },
      { id: "deno", name: "Deno", logo: "deno.svg", imgClass: "dark:invert" },
      { id: "hono", name: "Hono", logo: "hono.svg" },
      { id: "svelte", name: "Svelte", logo: "svelte.svg" },
      { id: "remix", name: "Remix", logo: "remix.svg" },
      { id: "expo", name: "Expo", logo: "expo.svg", imgClass: "dark:invert" },
      { id: "vue", name: "Vue", logo: "vue.svg" },
      { id: "nuxt", name: "Nuxt", logo: "nuxt.svg" },
    ],
  },
  {
    label: "Other Languages",
    frameworks: [
      { id: "python", name: "Python", logo: "python.svg" },
      { id: "rust", name: "Rust", logo: "rust.svg", imgClass: "dark:invert" },
      { id: "js", name: "JavaScript", logo: "js.svg" },
      { id: "script-tag", name: "Script Tag", logo: "script-tag.svg" },
    ],
  },
];

/** Flat list of all frameworks, used to look up the active selection by ID. */
const ALL_FRAMEWORKS = FRAMEWORK_GROUPS.flatMap((g) => g.frameworks);

interface SelectFrameworkProps {
  /** Optional callback fired after the user picks a new framework. */
  onChange?: (framework: Framework) => void;
}

/**
 * Framework selector dropdown rendered at the top of the sidebar.
 *
 * Reads and writes the selected framework through FrameworkContext, so the
 * selection is shared with the sidebar filter and persisted across navigations.
 * The dropdown also updates automatically when the user navigates to a
 * framework-specific page, because FrameworkContext watches the URL.
 */
export default function SelectFramework({ onChange }: SelectFrameworkProps) {
  const { selectedFramework, setSelectedFramework } = useFramework();

  // Derive the full Framework object from the context ID, falling back to the
  // first entry if the stored ID is somehow not found in the list.
  const selected = ALL_FRAMEWORKS.find((f) => f.id === selectedFramework) ?? ALL_FRAMEWORKS[0];

  const [isOpen, setIsOpen] = useState(false);

  // Ref on the root element so we can detect clicks outside and close the menu.
  const containerRef = useRef<HTMLDivElement>(null);

  // Ref on the scrollable list, reserved for future scroll-related behaviour.
  const listRef = useRef<HTMLDivElement>(null);

  // Base URL for framework logo images stored in /static/img/framework-logo/.
  const logoBase = useBaseUrl("/img/framework-logo/");

  // Close the dropdown whenever the user clicks anywhere outside the component.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current
        && !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Updates the context, closes the dropdown, and fires the optional callback. */
  function handleSelect(fw: Framework) {
    setSelectedFramework(fw.id);
    setIsOpen(false);
    onChange?.(fw);
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl bg-neutral-n2 px-1 pb-1 pt-1.5 dark:bg-neutral-n14"
    >
      {/* Label above the trigger button */}
      <span
        className="mb-1.5 block px-2 text-xs font-medium text-neutral-n10 dark:text-neutral-n7"
        aria-label="Select your Framework"
        style={{ fontFamily: "\"SF Pro Display\", sans-serif" }}
      >
        Select your Framework
      </span>

      {/* Trigger button — shows the currently selected framework logo and name */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex h-10 w-full items-center justify-between gap-x-2 rounded-lg border border-neutral-n10 bg-neutral-white py-2 pl-2.5 pr-3 text-[0.875rem]/5 text-gray-950 outline-none dark:bg-neutral-n13 dark:text-white"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex-none" aria-hidden="true">
            <img
              src={`${logoBase}${selected.logo}`}
              alt={selected.name}
              className={`block size-5 ${selected.imgClass ?? ""}`}
            />
          </span>
          {selected.name}
        </span>

        {/* Up/down chevron icon */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="size-4 flex-none stroke-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M4.75 10.75 8 14.25l3.25-3.5M4.75 5.25 8 1.75l3.25 3.5"
          />
        </svg>
      </button>

      {/* Dropdown panel — rendered only while the menu is open */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg bg-white shadow-[0_5px_15px_rgba(0,0,0,0.08),0_15px_35px_-5px_rgba(25,28,33,0.2)] ring-1 ring-black/10 dark:bg-neutral-n14">
          {/* Scrollable list of options grouped by category */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="Select a framework"
            className="max-h-72 overflow-y-auto py-1.5 text-sm/5 text-gray-950 [scrollbar-gutter:stable] dark:text-white"
          >
            {FRAMEWORK_GROUPS.map((group, groupIndex) => (
              <div key={group.label} role="group" aria-label={group.label}>
                {/* Section header — extra top padding on all groups except the first */}
                <div
                  className={`px-3.5 pb-1 text-[0.6875rem]/4 font-medium text-gray-400 dark:text-neutral-white ${
                    groupIndex === 0 ? "pt-1.5" : "pt-3"
                  }`}
                >
                  {group.label}
                </div>

                {group.frameworks.map((fw) => (
                  <div
                    key={fw.id}
                    role="option"
                    aria-selected={selected.id === fw.id}
                    onClick={() => handleSelect(fw)}
                    className={`mx-1.5 grid cursor-pointer grid-cols-[1.25rem_1fr_auto] items-center gap-1.5 rounded px-2 py-1 outline-none hover:bg-gray-50 dark:hover:bg-neutral-n13 ${
                      selected.id === fw.id
                        ? "bg-gray-50 ring-1 ring-gray-100 dark:bg-neutral-n13 dark:ring-neutral-n13"
                        : ""
                    }`}
                  >
                    {/* Framework logo */}
                    <span
                      className="flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <img
                        src={`${logoBase}${fw.logo}`}
                        alt={fw.name}
                        className={`size-4 ${fw.imgClass ?? ""}`}
                      />
                    </span>

                    {/* Framework name */}
                    <span>{fw.name}</span>

                    {/* Checkmark shown on the currently selected item */}
                    <div className="flex items-center gap-1.5">
                      {selected.id === fw.id && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12.1359 3.60688C12.4911 3.81999 12.6062 4.28069 12.3931 4.63587L7.89312 12.1359C7.7743 12.3339 7.57086 12.4662 7.34164 12.4944C7.11242 12.5226 6.88298 12.4436 6.71967 12.2803L3.71967 9.28033C3.42678 8.98744 3.42678 8.51256 3.71967 8.21967C4.01256 7.92678 4.48744 7.92678 4.78033 8.21967L7.1011 10.5404L11.1069 3.86413C11.32 3.50894 11.7807 3.39377 12.1359 3.60688Z"
                            className="fill-black dark:fill-white"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
