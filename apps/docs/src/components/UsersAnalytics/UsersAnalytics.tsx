import React from "react";
import PostHogAnalytics from "@site/src/components/UsersAnalytics/PostHogAnalytics";
import CookiesPopUp from "@site/src/components/UsersAnalytics/CookiesPopUp";

/** Root analytics wrapper — renders PostHog setup and the cookie consent banner */
export default function UsersAnalytics() {
  return (
    <>
      <PostHogAnalytics />
      <CookiesPopUp />
    </>
  );
}
