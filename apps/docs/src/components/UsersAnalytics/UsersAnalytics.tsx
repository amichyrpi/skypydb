import CookiesPopUp from "@site/src/components/UsersAnalytics/CookiesPopUp";
import PostHogAnalytics from "@site/src/components/UsersAnalytics/PostHogAnalytics";
import React from "react";

/** Root analytics wrapper — renders PostHog setup and the cookie consent banner */
export default function UsersAnalytics() {
  return (
    <>
      <PostHogAnalytics />
      <CookiesPopUp />
    </>
  );
}
