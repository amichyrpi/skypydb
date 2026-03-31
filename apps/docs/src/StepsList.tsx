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
  return (
    <li className="mesosphere-step">
      {stepNumber != null && (
        <div className="mesosphere-step__indicator">
          <div className="mesosphere-step__number">{stepNumber}</div>
          <div className="mesosphere-step__line" />
        </div>
      )}
      <div className="mesosphere-step__content">
        <h3 className="mesosphere-step__title">{title}</h3>
        <div className="mesosphere-step__body">{children}</div>
      </div>
    </li>
  );
}
