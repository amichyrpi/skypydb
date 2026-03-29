import useIsBrowser from "@docusaurus/useIsBrowser";
import { AnalyticsCookies } from "@site/src/components/UsersAnalytics/_AnalyticsCookies";
import Button from "@site/src/components/Button";
import React from "react";

/** Cookie consent banner with Accept / Reject buttons */
export default function CookiesPopUp() {
  const isBrowser = useIsBrowser();
  const { acceptedCookies, setAcceptedCookies } = AnalyticsCookies();

  // Skip rendering during server-side rendering
  if (!isBrowser) {
    return null;
  }

  // If the user has already accepted the cookies, don't render the banner
  if (acceptedCookies !== undefined) {
    return null;
  }

  return (
    <div className="fixed z-[100] bottom-4 left-4 right-4 rounded-lg border border-neutral-n4 bg-neutral-white text-neutral-n12 shadow-lg p-3 sm:left-auto sm:max-w-[24rem] dark:border-neutral-n11 dark:bg-neutral-n14 dark:text-white">
      <p className="mb-2 leading-tight">
        We use cookies to understand how people interact with our site.
      </p>
      <div className="flex justify-start gap-3 items-center">
        <Button onClick={() => setAcceptedCookies(true)}>Accept</Button>
        <Button onClick={() => setAcceptedCookies(false)}>Reject</Button>
        <a
          className="text-neutral-n10 hover:text-neutral-n12 dark:text-white dark:hover:text-white no-underline"
          href="https://www.usemesosphere.com/privacy/"
          target="_blank"
          style={{ color: "white", textDecoration: "none" }}
        >
          Privacy Settings
        </a>
      </div>
    </div>
  );
}
