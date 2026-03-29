declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default content;
}

import Link from "@docusaurus/Link";
import { ReactNode } from "@mdx-js/react/lib";
import BunLogo from "@site/static/img/framework-logo/bun.svg";
import ExpoLogo from "@site/static/img/framework-logo/expo.svg";
import ScriptTagLogo from "@site/static/img/framework-logo/script-tag.svg";
import JsLogo from "@site/static/img/framework-logo/js.svg";
import NextJSLogo from "@site/static/img/framework-logo/nextjs.svg";
import HonoLogo from "@site/static/img/framework-logo/hono.svg";
import DenoLogo from "@site/static/img/framework-logo/deno.svg";
import NodeLogo from "@site/static/img/framework-logo/node.svg";
import NuxtLogo from "@site/static/img/framework-logo/nuxt.svg";
import PythonLogo from "@site/static/img/framework-logo/python.svg";
import ReactLogo from "@site/static/img/framework-logo/react.svg";
import RemixLogo from "@site/static/img/framework-logo/remix.svg";
import RustLogo from "@site/static/img/framework-logo/rust.svg";
import SvelteLogo from "@site/static/img/framework-logo/svelte.svg";
import TanStackLogo from "@site/static/img/framework-logo/tanstack.svg";
import VueLogo from "@site/static/img/framework-logo/vue.svg";
import Heading from "@theme/Heading";
import React from "react";

function CardArrow() {
  return (
    <span className="card-arrow-wrapper">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="card-arrow"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M6.75 4.75 10.25 8l-3.5 3.25"
        />
      </svg>
    </span>
  );
}

type Item = {
  docId: string;
  href: string;
  label: string;
  icon?: ReactNode;
  invertIcon?: true;
};

type LargeCardItem = {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
};

/** Grid of quickstart link cards with icons */
export function DocslinksList(props: { items: Item[] }) {
  const { items } = props;
  return (
    <div className="qs-cards">
      {items.map((item, index) => (
        <DocsLink key={index} item={item} />
      ))}
    </div>
  );
}

/** Single quickstart card with icon and label */
export function DocsLink({
  className,
  item,
}: {
  className?: string;
  item: Item;
}) {
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
      <div className="card-hover-border" />
      {icon}
      <div>
        <Heading as="h2" className="text--truncate" title={item.label}>
          {item.label}
          <CardArrow />
        </Heading>
      </div>
    </Link>
  );
}

/** Grid of wider promotional cards with title and description */
export function LargeCardList(props: { items: LargeCardItem[] }) {
  return (
    <div className="large-cards">
      {props.items.map((item, index) => (
        <Link key={index} href={item.href} className="large-card">
          <div className="card-hover-border" />
          {item.icon && <div className="large-card-icon">{item.icon}</div>}
          <div>
            <Heading as="h2">
              {item.title}
              <CardArrow />
            </Heading>
            <p>{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Pre-configured card grid listing all supported frontend frameworks */
export function QuickFrameworksList() {
  return (
    <DocslinksList
      items={[
        {
          icon: <ReactLogo height={40} />,
          href: "/quickstart/react",
          docId: "quickstart/react",
          label: "React",
        },
        {
          icon: <NextJSLogo height={40} />,
          invertIcon: true,
          href: "/quickstart/nextjs",
          docId: "quickstart/nextjs",
          label: "Next.js",
        },
        {
          icon: <RemixLogo height={40} />,
          invertIcon: true,
          href: "/quickstart/remix",
          docId: "quickstart/remix",
          label: "Remix",
        },
        {
          icon: <TanStackLogo height={40} width={40} />,
          href: "/quickstart/tanstack-start",
          docId: "quickstart/tanstack-start",
          label: "TanStack Start",
        },
        {
          icon: <ExpoLogo height={40} />,
          invertIcon: true,
          href: "/quickstart/react-native",
          docId: "quickstart/react-native",
          label: "React Native",
        },
        {
          icon: <VueLogo height={40} />,
          href: "/quickstart/vue",
          docId: "quickstart/vue",
          label: "Vue",
        },
        {
          icon: <NuxtLogo height={40} />,
          href: "/quickstart/nuxt",
          docId: "quickstart/nuxt",
          label: "Nuxt",
        },
        {
          icon: <SvelteLogo height={40} />,
          href: "/quickstart/svelte",
          docId: "quickstart/svelte",
          label: "Svelte",
        },
        {
          icon: <NodeLogo height={40} />,
          href: "/quickstart/nodejs",
          docId: "quickstart/nodejs",
          label: "Node.js",
        },
        {
          icon: <BunLogo height={40} />,
          href: "/quickstart/bun",
          docId: "quickstart/bun",
          label: "Bun",
        },
        {
          icon: <HonoLogo height={40} />,
          href: "/quickstart/hono",
          docId: "quickstart/hono",
          label: "Hono",
        },
        {
          icon: <DenoLogo height={40} />,
          invertIcon: true,
          href: "/quickstart/deno",
          docId: "quickstart/deno",
          label: "Deno",
        },
        {
          icon: <ScriptTagLogo height={40} />,
          href: "/quickstart/script-tag",
          docId: "quickstart/script-tag",
          label: "Script tag",
        },
      ]}
    />
  );
}

/** Pre-configured card grid listing all supported programming languages */
export function QuickLanguagesList() {
  return (
    <DocslinksList
      items={[
        {
          icon: <JsLogo height={40} />,
          href: "/client/javascript",
          docId: "client/javascript",
          label: "JavaScript",
        },
        {
          icon: <PythonLogo height={40} />,
          href: "/quickstart/python",
          docId: "quickstart/python",
          label: "Python",
        },
        {
          icon: <RustLogo height={40} width={40} />,
          href: "/quickstart/rust",
          docId: "quickstart/rust",
          label: "Rust",
        },
      ]}
    />
  );
}
