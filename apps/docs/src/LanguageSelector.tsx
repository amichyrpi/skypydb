import React, { useEffect, useRef, useState } from "react";
import { useSelectedDialect, useSetDialect } from "./theme/Root";

const dialects = ["JS", "TS"] as const;

/** Dropdown select for toggling the active JS/TS dialect */
export function LanguageSelector({ verbose }: { verbose?: true }) {
  const selected = useSelectedDialect();
  const setDialect = useSetDialect();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className={`language-selector ${verbose ? "language-selector-verbose" : ""}`}
    >
      <button
        type="button"
        aria-label="Select language"
        aria-expanded={open}
        className="language-selector__trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label(selected, verbose)}</span>
        <svg
          className="language-selector__chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul className="language-selector__menu" role="listbox">
          {dialects.map((d) => (
            <li
              key={d}
              role="option"
              aria-selected={d === selected}
              className={`language-selector__option ${d === selected ? "language-selector__option--active" : ""}`}
              onClick={() => {
                setDialect(d);
                setOpen(false);
              }}
            >
              {label(d, verbose)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Return the display label for a dialect option */
function label(dialect: "JS" | "TS", verbose: true | undefined): string {
  return verbose ? (dialect === "JS" ? "JavaScript" : "TypeScript") : dialect;
}

/** Convert a filename's extension between JS and TS dialects */
export function convertFilePath(
  filename: string,
  dialect: "JS" | "TS",
  overrideDialectExtension?: string,
) {
  const [_, name, extension] = filename.match(/^(.*)\.([^.]*)$/);
  return `${name}.${
    dialect === "JS"
      ? overrideDialectExtension !== undefined
        ? overrideDialectExtension
        : extension.replace("t", "j")
      : extension.replace("j", "t")
  }`;
}
