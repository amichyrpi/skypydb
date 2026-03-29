import useIsBrowser from "@docusaurus/useIsBrowser";
import { useCookies } from "react-cookie";

/** Hook returning the current cookie consent value and a setter */
export function AnalyticsCookies() {
  // Shared cookie name across all Mesosphere web properties
  const COOKIES_NAME = "AnalyticsCookies";

  const host = window.location.hostname;

  const [cookies, setCookie] = useCookies([COOKIES_NAME]);
  const isBrowser = useIsBrowser();

  // undefined = user has not yet responded to the cookie banner
  const acceptedCookies = cookies[COOKIES_NAME] as boolean | undefined;

  const setAcceptedCookies = (value: boolean) => {
    if (!isBrowser) {
      return;
    }

    const isMesosphere =
      host === "usemesosphere.com" || host.endsWith(".usemesosphere.com");

    setCookie(COOKIES_NAME, value, {
      domain: isMesosphere ? ".usemesosphere.com" : undefined,
      path: "/",
      maxAge: 34560000,
      // Only set the secure flag outside of localhost
      secure: host !== "localhost",
    });
  };

  return { acceptedCookies, setAcceptedCookies };
}
