import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import React from "react";

type Props = {
  onClick: () => void;
};

function SearchButton({ onClick }: Props) {
  // Detect macOS/iOS to show the correct modifier key symbol
  const isMac = /Mac|iPhone|iPad/.test(window.navigator.userAgent);

  return (
    <button
      className="flex items-center gap-2 px-3 py-0 text-sm transition-colors border border-solid rounded-lg border-neutral-n11 bg-neutral-n2 dark:bg-neutral-n13 h-9 hover:cursor-pointer"
      onClick={onClick}
      aria-label="Search"
      style={{ fontFamily: '"SF Pro Display", sans-serif' }}
    >
      <MagnifyingGlassIcon className="w-5 h-5 text-neutral-n10 dark:text-neutral-n7 shrink-0" />
      <span className="hidden sm:block text-neutral-n10 dark:text-neutral-n7 whitespace-nowrap">
        Search documentation
      </span>

      <span className="items-center hidden gap-0.5 ml-4 px-1.5 py-0.5 text-xs rounded md:flex bg-neutral-n5 dark:bg-neutral-n10 text-neutral-n9 dark:text-neutral-n7">
        {isMac ? "⌘" : "Ctrl"} K
      </span>
    </button>
  );
}

export default SearchButton;
