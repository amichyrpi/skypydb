import { useEffect, useState } from "react";

type ApiStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

export default function APITester() {
  const [status, setStatus] = useState<ApiStatus>({ state: "idle" });

  useEffect(() => {
    let isMounted = true;
    async function check() {
      setStatus({ state: "loading" });
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const payload = (await response.json()) as { ok: boolean; time?: string };
        if (!payload.ok) {
          throw new Error("Server reported unhealthy");
        }
        if (isMounted) {
          setStatus({
            state: "ok",
            message: payload.time ? `Healthy as of ${payload.time}` : "Healthy",
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            state: "error",
            message:
              error instanceof Error ? error.message : "Unable to reach API",
          });
        }
      }
    }

    void check();
    return () => {
      isMounted = false;
    };
  }, []);

  if (status.state === "loading") {
    return <div className="state">Checking API...</div>;
  }

  if (status.state === "error") {
    return <div className="state error">API: {status.message}</div>;
  }

  if (status.state === "ok") {
    return <div className="state success">API: {status.message}</div>;
  }

  return null;
}
