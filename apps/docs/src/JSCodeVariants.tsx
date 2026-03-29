import React from "react";
import { useSelectedDialect } from "./theme/Root";

/** Show the TS or JS code variant depending on the active dialect */
export function JSCodeVariants({ children }) {
  const childArray = React.Children.toArray(children);
  const changeFileDialect = useSelectedDialect();
  if (childArray.length !== 2) {
    throw new Error(
      `JSCodeVariants expects 2 children, got ${childArray.length}`,
    );
  }
  return changeFileDialect === "TS" ? childArray[0] : childArray[1];
}
