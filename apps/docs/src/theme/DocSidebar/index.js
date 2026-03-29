import { useWindowSize } from "@docusaurus/theme-common";
import DocSidebarDesktop from "@theme/DocSidebar/Desktop";
import DocSidebarMobile from "@theme/DocSidebar/Mobile";
import React from "react";

/** Responsive sidebar — renders desktop on SSR/desktop, mobile on small screens */
export default function DocSidebar(props) {
  const windowSize = useWindowSize();
  // On desktop the sidebar is visible on hydration so we need SSR rendering
  const shouldRenderSidebarDesktop =
    windowSize === "desktop" || windowSize === "ssr";
  // On mobile the sidebar is not visible on hydration so we can avoid using SSR rendering
  const shouldRenderSidebarMobile = windowSize === "mobile";
  return (
    <>
      {shouldRenderSidebarDesktop && <DocSidebarDesktop {...props} />}
      {shouldRenderSidebarMobile && <DocSidebarMobile {...props} />}
    </>
  );
}
