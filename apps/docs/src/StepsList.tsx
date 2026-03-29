import { ReactNode } from "@mdx-js/react/lib";
import React from "react";

/** Ordered list wrapper for Step components */
export function StepsList({ children }: { children: ReactNode }) {
  return <ol className="mesosphere-steps-list">{children}</ol>;
}

/** A single step with a title, description, and code block as the last child */
export function Step({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) {
  const childArray = React.Children.toArray(children);
  const description = childArray.slice(0, -1);
  const code = childArray.slice(-1)[0];

  return (
    <li>
      <div className="mesosphere-step">
        <div>
          <div style={{ fontWeight: "bold" }}>{title}</div>
          {description}
        </div>
        <div>{code}</div>
      </div>
    </li>
  );
}
