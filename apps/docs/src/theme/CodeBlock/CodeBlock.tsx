import { convertFilePath } from "@site/src/LanguageSelector";
import CodeBlock from "@theme-original/CodeBlock";
import React, { ReactNode } from "react";
import { useSelectedDialect, useSetDialect } from "../Root";

const dialects = ["TS", "JS"] as const;

/** Code block with optional language-selector tab bar */
export default function CodeBlockWrapper({
  metastring,
  showLanguageSelector,
  title: titleProp,
  ...props
}: {
  className?: string;
  metastring?: string;
  originalType?: string;
  showLanguageSelector?: boolean;
  title?: ReactNode;
  children?: ReactNode;
}) {
  const [_, language] = props.className?.match(/language-(\w+)/) ?? [];
  const title = parseCodeBlockTitle(metastring) ?? titleProp;
  const shouldShowLanguageSelector = showLanguageSelector === true
    || (showLanguageSelector !== false
      && title !== undefined
      && title !== null
      && !shouldNotVary(metastring)
      && (language === "tsx" || language === "ts"));

  const selectedDialect = useSelectedDialect();
  const setDialect = useSetDialect();

  // Resolve the displayed title (dialect-aware if selector is active)
  const displayTitle = shouldShowLanguageSelector && typeof title === "string"
    ? convertFilePath(title, selectedDialect)
    : title;

  const codeBlock = (
    <CodeBlock
      title={displayTitle as unknown as string}
      showLineNumbers
      {...props}
    />
  );

  if (!shouldShowLanguageSelector) {
    return codeBlock;
  }

  return (
    <div className="codeblock-with-selector">
      {/* Language tab bar */}
      <div className="codeblock-language-tabs">
        {dialects.map((d) => (
          <button
            key={d}
            type="button"
            className={`codeblock-language-tab${selectedDialect === d ? " codeblock-language-tab--active" : ""}`}
            onClick={() => setDialect(d)}
          >
            {d}
          </button>
        ))}
      </div>
      {/* Code block (title + code) */}
      {codeBlock}
    </div>
  );
}

/** Extract the title from a code block's metastring (e.g. title="file.ts") */
export function parseCodeBlockTitle(metastring?: string) {
  return metastring?.match(codeBlockTitleRegex)?.groups!.title;
}

/** Check if the metastring opts out of dialect variation via "noDialect" */
export function shouldNotVary(metastring?: string) {
  return metastring?.includes("noDialect");
}

const codeBlockTitleRegex = /title=(?<quote>["'])(?<title>.*?)\1/;
