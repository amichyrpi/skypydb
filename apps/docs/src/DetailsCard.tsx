import { ReactNode } from "@mdx-js/react/lib";
import RawDetails from "@theme-original/Details";
import React from "react";

/** Collapsible details/summary section for use in MDX docs */
export function DetailsCard({
  children,
  summary,
  className,
}: {
  children: ReactNode;
  summary: ReactNode;
  className?: string;
}) {
  return (
    <RawDetails className={className} summary={<summary>{summary}</summary>}>
      {children}
    </RawDetails>
  );
}
