import posthog from "posthog-js";
import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";

declare global {
  interface Window {
    posthog?: {
      capture(event: string): void;
    };
  }
}

// Return null during SSR; register route-change handler in the browser
export default (function () {
  if (!ExecutionEnvironment.canUseDOM) {
    return null;
  }

  return {
    onRouteUpdate({ location, previousLocation }) {
      if (location.pathname !== previousLocation?.pathname) {
        posthog.capture("$pageview");
      }
    },
  };
})();
