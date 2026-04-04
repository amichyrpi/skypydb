import React, { ReactNode } from "react";

/** Ordered list wrapper for Step components */
export function StepsList({ children }: { children: ReactNode }) {
  return (
    <ol className="mesosphere-steps-list">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            stepNumber: index + 1,
          });
        }
        return child;
      })}
    </ol>
  );
}

/** Parse backtick-delimited segments into <code> elements */
function parseInlineCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part
  );
}

/** A single step with a numbered badge, title, and content */
export function Step({
  children,
  title,
  stepNumber,
}: {
  children: ReactNode;
  title: ReactNode;
  stepNumber?: number;
}) {
  const renderedTitle = typeof title === "string" ? parseInlineCode(title) : title;

  return (
    <li className="mesosphere-step">
      {stepNumber != null && (
        <div className="mesosphere-step__indicator">
          <div className="mesosphere-step__number">{stepNumber}</div>
          <div className="mesosphere-step__line" />
        </div>
      )}
      <div className="mesosphere-step__content">
        <h3 className="mesosphere-step__title">{renderedTitle}</h3>
        <div className="mesosphere-step__body">{children}</div>
      </div>
    </li>
  );
}
