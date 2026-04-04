import { useDoc } from "@docusaurus/plugin-content-docs/client";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { CheckIcon, ExternalLinkIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import clsx from "clsx";
import React, { useCallback, useRef, useState } from "react";

/** Button that opens the current doc page on GitHub in a new tab */
export function EditPageOnGithub() {
  const [isOpened, setIsOpened] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const openTimeout = useRef<number | undefined>(undefined);

  const githubUrl = "main";
  const docsUrl = "apps/docs/";

  const {
    siteConfig: { organizationName, projectName },
  } = useDocusaurusContext();
  const {
    metadata: { source },
  } = useDoc();

  try {
    if (!source || !organizationName || !projectName) {
      throw new Error("Missing GitHub metadata");
    }
  } catch (error) {
    console.error("Failed to get GitHub metadata:", error);
  }

  const sourcePath = source.replace(/^@site\//, "");

  const editUrl = encodeURI(
    `https://github.com/${organizationName}/${projectName}/edit/${githubUrl}/${docsUrl}${sourcePath}`,
  );

  const handleEditOnGithub = useCallback(() => {
    if (!editUrl) return;

    // Open GitHub in new tab
    window.open(editUrl, "_blank");

    setIsOpened(true);
    setHasBeenOpened(true);
    openTimeout.current = window.setTimeout(() => {
      setIsOpened(false);
    }, 2000);
  }, [editUrl]);

  return (
    <button
      type="button"
      className="font-[inherit] appearance-none bg-transparent p-0 rounded border-0 text-(--mesosphere-breadcrumb-font-color) transition-colors cursor-pointer disabled:opacity-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none overflow-hidden relative dark:hover:text-white"
      onClick={handleEditOnGithub}
      aria-label="Edit this page on GitHub"
    >
      <div
        className={clsx(
          "px-2 py-1 flex gap-1.5 items-center",
          hasBeenOpened && !isOpened && "animate-slideToTop",
          isOpened && "opacity-0",
        )}
        {...(isOpened && { inert: "inert" })}
      >
        <GitHubLogoIcon />
        Edit this page on GitHub
        <ExternalLinkIcon />
      </div>
      <div
        className={clsx(
          "absolute inset-0 px-2 py-1 flex gap-1.5 items-center",
          isOpened && "animate-slideToTop",
          !isOpened && "opacity-0",
        )}
        {...(!isOpened && { inert: "inert" })}
      >
        <CheckIcon className="text-green-g3" />
        Opened on GitHub!
      </div>
    </button>
  );
}
