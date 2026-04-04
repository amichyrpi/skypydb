import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import posthog from "posthog-js";
import { useEffect } from "react";
import { AnalyticsCookies } from "./_AnalyticsCookies";

/** Initialise PostHog and manage persistence based on cookie consent */
export default function PostHogAnalytics() {
  const { acceptedCookies } = AnalyticsCookies();
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    const PostHogKey = siteConfig.customFields.POSTHOG_KEY as string;
    const PostHogHost = siteConfig.customFields.POSTHOG_HOST as string;
    // Only initialise in production (includes deploy previews)
    const inProduction = siteConfig.customFields.NODE_ENV === "production";

    if (!inProduction || !PostHogKey || !PostHogHost) {
      return;
    }

    posthog.init(PostHogKey, {
      api_host: PostHogHost,
      ui_host: "https://us.posthog.com/",
      debug: false,
      capture_pageview: false,
      persistence: "memory",
    });
  }, [siteConfig]);

  useEffect(() => {
    if (acceptedCookies) {
      posthog.set_config({
        persistence: "localStorage+cookie",
      });
    }
  }, [acceptedCookies]);

  return null;
}
