import { Cross1Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { cn } from "@site/src/lib/cn";
import React, { useEffect, useRef } from "react";

interface SearchBoxProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  className?: string;
}

export default function SearchBox({
  value,
  onChange,
  onClear,
  className,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /** Programmatically focus the search input */
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /** Clear the input and re-focus it */
  const handleClear = () => {
    onClear();
    focusInput();
  };

  // Auto-focus the input when the component mounts
  useEffect(() => {
    focusInput();
  }, []);

  // Navigate to the selected result when Enter is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        const linkElement = document.querySelector(
          '.js-hitList-item[aria-selected="true"] a',
        );
        if (linkElement) {
          const url = linkElement.getAttribute("href");
          const target = linkElement.getAttribute("target") || "_self";
          window.open(url, target);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-center h-[44px] border-none",
        className,
      )}
    >
      <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-neutral-n7 pointer-events-none" />
      <input
        className="w-full h-full bg-neutral-n2 dark:bg-neutral-n13 border-none text-sm text-neutral-n13 dark:text-white pl-[42px] pr-[42px] focus:outline-hidden"
        style={{ fontFamily: '"SF Pro Display", sans-serif' }}
        type="text"
        placeholder="Search documentation"
        value={value}
        onChange={onChange}
        ref={inputRef}
      />
      {value !== "" && (
        <button
          className="absolute right-3 border-none bg-neutral-n2 dark:bg-neutral-n13 p-0 flex items-center cursor-pointer"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <Cross1Icon className="h-4 w-4 text-neutral-n7" />
        </button>
      )}
    </div>
  );
}
