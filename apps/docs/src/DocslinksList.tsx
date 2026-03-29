import Link from "@docusaurus/Link";
import { useDocById } from "@docusaurus/plugin-content-docs/client";
import Heading from "@theme/Heading";
import React, { ReactNode } from "react";

type Item = {
  docId: string;
  href: string;
  label: string;
  icon?: ReactNode;
  invertIcon?: true;
};

/** Render a grid of doc link cards */
export function DocslinksList(props: { items: Item[] }) {
  const { items } = props;
  return (
    <div className="cards">
      {items.map((item, index) => (
        <DocsLink key={index} item={item} />
      ))}
    </div>
  );
}

/** Single card linking to a doc page, showing its title and description */
export function DocsLink({
  className,
  item,
}: {
  className?: string;
  item: Item;
}) {
  const doc = useDocById(item.docId ?? undefined);
  const icon = item.icon;
  return (
    <Link
      href={item.href}
      className={
        "card" +
        (item.invertIcon ? " mesosphere-invert-icon" : "") +
        " " +
        (className ?? "")
      }
    >
      {icon}
      <div>
        <Heading as="h2" className="text--truncate" title={item.label}>
          {item.label}
        </Heading>
        <p className="text--truncate" title={doc?.description}>
          {doc?.description}
        </p>
      </div>
    </Link>
  );
}
