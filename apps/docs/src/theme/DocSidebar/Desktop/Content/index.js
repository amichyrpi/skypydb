import { ThemeClassNames } from "@docusaurus/theme-common";
import {
  useAnnouncementBar,
  useScrollPosition,
} from "@docusaurus/theme-common/internal";
import { translate } from "@docusaurus/Translate";
import DocSidebarItems from "@theme/DocSidebarItems";
import clsx from "clsx";
import React, { useState } from "react";
import SelectFramework from "@site/src/components/SelectFramework";
import { useFramework, filterSidebar } from "@site/src/context/FrameworkContext";
import styles from "./styles.module.css";

/** Show the announcement bar only when the page is scrolled to the top */
function useShowAnnouncementBar() {
  const { isActive } = useAnnouncementBar();
  const [showAnnouncementBar, setShowAnnouncementBar] = useState(isActive);
  useScrollPosition(
    ({ scrollY }) => {
      if (isActive) {
        setShowAnnouncementBar(scrollY === 0);
      }
    },
    [isActive],
  );
  return isActive && showAnnouncementBar;
}

/** Sidebar nav content — swizzled to remove the thin_scrollbar class */
export default function DocSidebarDesktopContent({ path, sidebar, className }) {
  const showAnnouncementBar = useShowAnnouncementBar();
  const { selectedFramework } = useFramework();
  const filteredSidebar = filterSidebar(sidebar, selectedFramework);
  return (
    <nav
      aria-label={translate({
        id: "theme.docs.sidebar.navAriaLabel",
        message: "Docs sidebar",
        description: "The ARIA label for the sidebar navigation",
      })}
      className={clsx(
        // We had to swizzle the sidebar to remove the thin_scrollbar class
        "menu",
        styles.menu,
        showAnnouncementBar && styles.menuWithAnnouncementBar,
        className,
      )}
    >
      <div className="pb-2">
        <SelectFramework />
      </div>
      <ul className={clsx(ThemeClassNames.docs.docSidebarMenu, "menu__list")}>
        <DocSidebarItems items={filteredSidebar} activePath={path} level={1} />
      </ul>
    </nav>
  );
}
