import { processAdmonitionProps } from "@docusaurus/theme-common";
import React, { type ReactNode } from "react";
import styles from "./styles.module.css";

/** Lightbulb icon used for note and tip admonitions. */
function LightbulbIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={styles.icon}
    >
      <circle
        cx="10"
        cy="10"
        r="7.25"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.5 13.5h3M10 6v0a2.5 2.5 0 0 1 2.5 2.5c0 1-.7 1.85-1.25 2.5-.35.4-.5.7-.5 1v.5h-1.5v-.5c0-.3-.15-.6-.5-1C8.2 10.85 7.5 10 7.5 8.5A2.5 2.5 0 0 1 10 6Z"
      />
    </svg>
  );
}

/** Exclamation icon used for info, warning, danger, and caution admonitions. */
function InfoIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={styles.icon}
    >
      <circle
        cx="10"
        cy="10"
        r="7.25"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-2a1 1 0 0 1-1-1V7a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Config per admonition type
const ADMONITION_CONFIGS: Record<
  string,
  { label: string; className: string; Icon: () => ReactNode }
> = {
  note: { label: "Note", className: styles.note, Icon: LightbulbIcon },
  tip: { label: "Tip", className: styles.tip, Icon: LightbulbIcon },
  info: { label: "Info", className: styles.info, Icon: InfoIcon },
  warning: { label: "Warning", className: styles.warning, Icon: InfoIcon },
  danger: { label: "Danger", className: styles.danger, Icon: InfoIcon },
  caution: { label: "Caution", className: styles.caution, Icon: InfoIcon },
};

interface AdmonitionProps {
  type?: string;
  title?: string | ReactNode;
  children: ReactNode;
}

/**
 * Renders a styled admonition callout.
 * Props are pre-processed via `processAdmonitionProps` to support
 * both JSX `<Admonition>` and `:::` markdown directive syntax.
 */
export default function Admonition(
  unprocessedProps: AdmonitionProps,
): ReactNode {
  const {
    type = "note",
    title,
    children,
  } = processAdmonitionProps(unprocessedProps);
  const config = ADMONITION_CONFIGS[type] ?? ADMONITION_CONFIGS.note;
  const heading = title ?? config.label;

  return (
    <div className={`${styles.admonition} ${config.className}`}>
      <div className={styles.bar} />
      <p className={styles.heading}>
        <config.Icon />
        <span className={styles.title}>{heading}</span>
      </p>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
