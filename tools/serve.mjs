// Local harness: static files from public/ + the real api handler (bundled with mock blobs).
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import apiHandler from "/tmp/harness/api.mjs";
import tickHandler from "/tmp/harness/tick.mjs";

const PUB = new URL("../public", import.meta.url).pathname;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8788");
  try {
    if (url.pathname === "/__tick") {
      await tickHandler(new Request(url));
      res.writeHead(200).end("ticked");
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const freq = new Request(url, { method: req.method, headers: req.headers, body: body.length ? body : undefined });
      const fres = await apiHandler(freq);
      const buf = Buffer.from(await fres.arrayBuffer());
      res.writeHead(fres.status, Object.fromEntries(fres.headers));
      res.end(buf);
      return;
    }
    let p = join(PUB, url.pathname === "/" ? "index.html" : url.pathname);
    if (!existsSync(p)) { res.writeHead(404).end("nope"); return; }
    res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
    res.end(readFileSync(p));
  } catch (e) {
    console.error("harness error", url.pathname, e);
    res.writeHead(500).end(String(e));
  }
});
server.listen(8788, () => console.log("harness on :8788"));
