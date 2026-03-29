import { join, normalize, resolve, sep } from "path";

const isProd = process.env.NODE_ENV === "production";
const publicDir = isProd ? "dist" : ".";

function injectEnv(html: string) {
  const url = process.env.MESOSPHERE_URL ?? "";
  const publicApiKey = process.env.MESOSPHERE_PUBLIC_API_KEY ?? "";
  return html
    .replaceAll("__MESOSPHERE_URL__", url)
    .replaceAll("__MESOSPHERE_API_KEY__", publicApiKey);
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: !isProd ? { hmr: true } : undefined,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, time: new Date().toISOString() });
    }

    const pathname =
      url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");

    let filePath: string;
    if (!isProd && pathname === "index.html") {
      filePath = join("src", "index.html");
    } else {
      const normalizedPathname = normalize(pathname);
      const base = resolve(publicDir);
      const resolvedPath = resolve(publicDir, normalizedPathname);

      if (resolvedPath !== base && !resolvedPath.startsWith(base + sep)) {
        return new Response("Not Found", { status: 404 });
      }

      filePath = resolvedPath;
    }

    if (!isProd && pathname.endsWith(".tsx")) {
      const buildResult = await Bun.build({
        entrypoints: [filePath],
        target: "browser",
        format: "esm",
        sourcemap: "inline",
        minify: false,
        splitting: false,
      });

      if (!buildResult.success) {
        return new Response(
          buildResult.logs.map((log) => log.message).join("\n"),
          {
            status: 500,
          },
        );
      }

      const output = buildResult.outputs[0];
      if (!output) {
        return new Response("Build produced no output", { status: 500 });
      }
      return new Response(output, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
        },
      });
    }

    const file = Bun.file(filePath);
    if (await file.exists()) {
      if (pathname === "index.html") {
        const html = injectEnv(await file.text());
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Bun server running at http://localhost:${server.port}`);
