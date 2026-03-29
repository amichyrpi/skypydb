import React from "react";
import ButtonCta from "@site/src/components/ButtonCta";

type Props = {
  href?: string;
  label?: string;
  className?: string;
};

/** External link button for the Mesosphere dashboard; hidden when href is absent */
export default function MesosphereDashboard({ href, label, className }: Props) {
  if (!href) {
    return null;
  }

  return (
    <ButtonCta
      href={href}
      className={className ?? ""}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label ?? "Dashboard"}
    </ButtonCta>
  );
}
