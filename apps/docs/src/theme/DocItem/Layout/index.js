import { useDoc } from "@docusaurus/plugin-content-docs/client";
import { useWindowSize } from "@docusaurus/theme-common";
import { EditPageOnGithub } from "@site/src/components/EditPageOnGithub";
import Footer from "@theme-original/Footer";
import ContentVisibility from "@theme/ContentVisibility";
import DocBreadcrumbs from "@theme/DocBreadcrumbs";
import DocItemContent from "@theme/DocItem/Content";
import DocItemFooter from "@theme/DocItem/Footer";
import DocItemPaginator from "@theme/DocItem/Paginator";
import DocItemTOCDesktop from "@theme/DocItem/TOC/Desktop";
import DocItemTOCMobile from "@theme/DocItem/TOC/Mobile";
import DocVersionBadge from "@theme/DocVersionBadge";
import DocVersionBanner from "@theme/DocVersionBanner";
import clsx from "clsx";
import React from "react";
import styles from "./styles.module.css";

/** Determine whether a mobile or desktop TOC should be rendered */
function useDocTOC() {
  const { frontMatter, toc } = useDoc();
  const windowSize = useWindowSize();
  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;
  const mobile = canRender ? <DocItemTOCMobile /> : undefined;
  const desktop = canRender && (windowSize === "desktop" || windowSize === "ssr") ? <DocItemTOCDesktop /> : undefined;
  return {
    hidden,
    mobile,
    desktop,
  };
}

/** Wrapper that adds top margin to the EditPageOnGithub button */
function EditPageOnGithubSection() {
  return (
    <div className="docusaurus-mt-lg">
      <EditPageOnGithub />
    </div>
  );
}

/** Full doc page layout with article content, TOC sidebar, and footer */
export default function LayoutWrapper({ children }) {
  const docTOC = useDocTOC();
  const { metadata } = useDoc();

  return (
    <>
      <div className="row">
        <div className={clsx("col", !docTOC.hidden && styles.docItemCol)}>
          <ContentVisibility metadata={metadata} />
          <DocVersionBanner />
          <div className={styles.docItemContainer}>
            <article>
              <DocBreadcrumbs />
              <DocVersionBadge />
              {docTOC.mobile}
              <DocItemContent>{children}</DocItemContent>
              <DocItemFooter />
              <EditPageOnGithubSection />
            </article>
            <DocItemPaginator />
          </div>
        </div>
        {docTOC.desktop && <div className="col col--3">{docTOC.desktop}</div>}
      </div>
      <Footer />
    </>
  );
}
