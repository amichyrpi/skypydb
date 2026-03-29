import { Redirect } from "@docusaurus/router";
import React from "react";

/** Redirect the root path to the /home documentation page */
export default function Home() {
  return <Redirect to="/home" />;
}
