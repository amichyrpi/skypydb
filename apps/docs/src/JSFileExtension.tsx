import React from "react";
import { convertFilePath } from "./LanguageSelector";
import { useSelectedDialect } from "./theme/Root";

/** Renders a filename with its extension swapped to match the active dialect */
export function JSFileExtension({ name, ext }: { name: string; ext?: string }) {
  const changeFileDialect = useSelectedDialect();

  return <code>{convertFilePath(name, changeFileDialect, ext)}</code>;
}
