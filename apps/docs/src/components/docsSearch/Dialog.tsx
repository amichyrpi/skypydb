import { cn } from "@site/src/lib/cn";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Results from "./Results";
import SearchBox from "./SearchBox";

type Props = {
  open: boolean;
  onClose: () => void;
};

const Dialog = ({ open, onClose }: Props) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Create a persistent DOM container for the portal
  const [container] = useState(() => document.createElement("div"));

  // Debounce the search query by 250ms to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  // Mount and unmount the portal container on the document body
  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
  }, [open]);

  /** Update query state as the user types */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
  };

  /** Clear the current search query */
  const handleClear = () => {
    setQuery("");
  };

  /** Reset query and close the dialog */
  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  // Close the dialog when the Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  const dialogContent = open && (
    <div
      className="h-screen left-0 top-0 overflow-y-auto fixed w-screen z-[1000] md:flex md:justify-center"
      style={{ fontFamily: '"SF Pro Display", sans-serif' }}
    >
      <div
        className={cn(
          "h-full w-full flex flex-col md:z-[1001] md:rounded-lg md:shadow-lg md:h-fit md:max-h-[min(80vh,60rem)] md:mt-20 md:w-[32rem] overflow-hidden",
          query === ""
            ? "bg-neutral-n2 dark:bg-neutral-n13 bg-none md:!h-fit md:!px-1"
            : "bg-neutral-n2 dark:bg-neutral-n13",
        )}
      >
        <div className="flex gap-2 shrink-0">
          <SearchBox
            className="grow"
            value={query}
            onChange={handleChange}
            onClear={handleClear}
          />
          <button
            className="border-none bg-transparent cursor-pointer md:hidden"
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>
        {query !== "" && (
          <>
            <div className="h-px bg-neutral-n8 dark:bg-neutral-n10 shrink-0" />
            <Results query={debouncedQuery} />
          </>
        )}
      </div>
      <button
        className="hidden bg-neutral-n15/50 dark:bg-neutral-n15/80 inset-0 absolute border-none p-0 w-screen h-screen backdrop-blur-xs md:block"
        aria-label="Close search"
        onClick={handleClose}
      />
    </div>
  );

  return ReactDOM.createPortal(dialogContent, container);
};

export default Dialog;
