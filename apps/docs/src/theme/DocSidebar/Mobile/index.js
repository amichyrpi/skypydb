import { NavbarSecondaryMenuFiller, ThemeClassNames } from "@docusaurus/theme-common";
import { useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";
import SelectFramework from "@site/src/components/SelectFramework";
import { filterSidebar, useFramework } from "@site/src/context/FrameworkContext";
import DocSidebarItems from "@theme/DocSidebarItems";
import clsx from "clsx";
import React from "react";

/** Secondary menu content listing sidebar items for mobile */
const DocSidebarMobileSecondaryMenu = ({ sidebar, path }) => {
  const mobileSidebar = useNavbarMobileSidebar();
  const { selectedFramework } = useFramework();
  const filteredSidebar = filterSidebar(sidebar, selectedFramework);
  return (
    <>
      <div className="pb-2">
        <SelectFramework />
      </div>
      <ul className={clsx(ThemeClassNames.docs.docSidebarMenu, "menu__list")}>
        <DocSidebarItems
          items={filteredSidebar}
          activePath={path}
          onItemClick={(item) => {
            if (item.type === "category" && item.href) {
              mobileSidebar.toggle();
            }
            if (item.type === "link") {
              mobileSidebar.toggle();
            }
          }}
          level={1}
        />
      </ul>
    </>
  );
};

/** Registers the mobile sidebar as a navbar secondary menu */
function DocSidebarMobile(props) {
  return (
    <NavbarSecondaryMenuFiller
      component={DocSidebarMobileSecondaryMenu}
      props={props}
    />
  );
}
export default React.memo(DocSidebarMobile);
