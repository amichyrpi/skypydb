import { CubeIcon as CubeIconBase } from "@radix-ui/react-icons";
import { cn } from "@site/src/lib/cn";
import React, { useEffect, useRef, useState } from "react";
import { Result } from "./types";

const CubeIcon = CubeIconBase as React.FC<React.SVGProps<SVGSVGElement>>;

interface ResultListProps {
  results: Result[];
}

export default function ResultList({ results }: ResultListProps) {
  const [selectedResult, setSelectedResult] = useState(0);
  const [usingKeyboard, setUsingKeyboard] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedResultRef = useRef<HTMLLIElement>(null);

  // Navigate results with up/down arrow keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (selectedResult > 0) {
          setSelectedResult(selectedResult - 1);
        }
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (selectedResult !== null && selectedResult < results.length - 1) {
          setSelectedResult(selectedResult + 1);
        }
      }
      setUsingKeyboard(true);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedResult, results]);

  // Smooth-scroll the selected result into view during keyboard navigation
  useEffect(() => {
    if (usingKeyboard && selectedResultRef.current) {
      selectedResultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedResult, usingKeyboard]);

  // Reset selection to the first result when results change
  useEffect(() => {
    setSelectedResult(0);
  }, [results]);

  // Switch back to mouse-driven selection when the mouse moves
  useEffect(() => {
    const handleMouseMove = () => {
      setUsingKeyboard(false);
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <ul
      className="flex flex-col list-none p-0! m-0! divide-y divide-neutral-n7 dark:divide-neutral-n10"
      role="list"
      ref={listRef}
    >
      {results.map((result, index) => (
        <li
          key={result.url}
          ref={(element) => {
            if (index === selectedResult) {
              selectedResultRef.current = element;
            }
          }}
          role="listitem"
          // This is referenced by SearchBox.
          aria-selected={index === selectedResult}
          data-hit-index={index}
          className={cn(
            "js-hitList-item px-4 py-2.5 overflow-hidden transition-colors",
            index === selectedResult
              ? "bg-neutral-n2 dark:bg-neutral-n12"
              : "bg-transparent",
          )}
          onMouseEnter={() => {
            if (!usingKeyboard) {
              setSelectedResult(index);
            }
          }}
        >
          <a
            href={result.url}
            className="text-neutral-n12! flex gap-3 items-center no-underline! hover:no-underline! w-full dark:text-neutral-n8!"
          >
            <span className="text-sm overflow-hidden whitespace-nowrap text-ellipsis min-w-0">
              {result.title}
            </span>
            <CubeIcon className="w-4 h-4 shrink-0 text-neutral-n8 ml-auto" />
          </a>
        </li>
      ))}
    </ul>
  );
}
