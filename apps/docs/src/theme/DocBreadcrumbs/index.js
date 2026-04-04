import Link from "@docusaurus/Link";
import { useSidebarBreadcrumbs } from "@docusaurus/plugin-content-docs/client";
import { ThemeClassNames } from "@docusaurus/theme-common";
import { useHomePageRoute } from "@docusaurus/theme-common/internal";
import { translate } from "@docusaurus/Translate";
import { CopyPageAsMarkdown } from "@site/src/components/CopyPageAsMarkdown";
import HomeBreadcrumbItem from "@theme/DocBreadcrumbs/Items/Home";
import clsx from "clsx";
import React from "react";
import styles from "./styles.module.css";

/** Breadcrumb link — renders a plain span for the last (active) item */
function BreadcrumbsItemLink({ children, href, isLast }) {
  const className = "breadcrumbs__link";
  if (isLast) {
    return (
      <span className={className} itemProp="name">
        {children}
      </span>
    );
  }
  return href
    ? (
      <Link className={className} href={href} itemProp="item">
        <span itemProp="name">{children}</span>
      </Link>
    )
    : <span className={className}>{children}</span>;
}

/** Single breadcrumb list item with optional Schema.org microdata */
function BreadcrumbsItem({ children, active, index, addMicrodata }) {
  return (
    <li
      {...(addMicrodata && {
        itemScope: true,
        itemProp: "itemListElement",
        itemType: "https://schema.org/ListItem",
      })}
      className={clsx("breadcrumbs__item", {
        "breadcrumbs__item--active": active,
      })}
    >
      {children}
      <meta itemProp="position" content={String(index + 1)} />
    </li>
  );
}

/** Inner breadcrumb nav containing the Home link and all sidebar crumbs */
export function DocBreadcrumbsInner() {
  const breadcrumbs = useSidebarBreadcrumbs();
  const homePageRoute = useHomePageRoute();

  return (
    <nav
      className={clsx(
        ThemeClassNames.docs.docBreadcrumbs,
        styles.breadcrumbsContainer,
      )}
      aria-label={translate({
        id: "theme.docs.breadcrumbs.navAriaLabel",
        message: "Breadcrumbs",
        description: "The ARIA label for the breadcrumbs",
      })}
    >
      <ul
        className="breadcrumbs"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {homePageRoute && <HomeBreadcrumbItem />}
        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <BreadcrumbsItem
              key={idx}
              active={isLast}
              index={idx}
              addMicrodata={!!item.href}
            >
              <BreadcrumbsItemLink href={item.href} isLast={isLast}>
                {item.label}
              </BreadcrumbsItemLink>
            </BreadcrumbsItem>
          );
        })}
      </ul>
    </nav>
  );
}

/** Top-level breadcrumbs component — shows crumbs + copy-as-markdown button */
export default function DocBreadcrumbs() {
  const breadcrumbs = useSidebarBreadcrumbs();

  const showBreadcrumbs = breadcrumbs && breadcrumbs.length >= 2;

  return showBreadcrumbs
    ? (
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <DocBreadcrumbsInner />
        <CopyPageAsMarkdown />
      </div>
    )
    : (
      <div className="flex justify-end sm:block sm:float-right">
        <CopyPageAsMarkdown />
      </div>
    );
}
