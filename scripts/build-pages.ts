import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { zContent } from "../shared/content";
import { buildDefaultContent } from "../server/defaultContent";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist", "public");
const archive = path.join(root, "portfolio-media", "manus-storage");

const MEDIA: [string, string][] = [
  ["hero-cutout_1572fc27.webp", "hero-cutout.webp"],
  ["profile_9a5bcc13.webp", "profile.webp"],
  ["og-base_e81cb4a6.jpg", "og-base.jpg"],
  ["credentials-collage_334ea6f5.webp", "credentials-collage.webp"],
  ["async-images/wapusYJwxYPR5WfIh8B9vf/image-1.webp", "project-gallery-1.webp"],
  ["async-images/wapusYJwxYPR5WfIh8B9vf/image-2.webp", "project-gallery-2.webp"],
  ["async-images/wapusYJwxYPR5WfIh8B9vf/image-3.webp", "project-gallery-3.webp"],
  ["async-images/wapusYJwxYPR5WfIh8B9vf/image-4.webp", "project-gallery-4.webp"],
  ["async-images/wapusYJwxYPR5WfIh8B9vf/image-5.webp", "project-gallery-5.webp"],
  ["async-images/fpwI6wTEgdeTM0rp3FH788/image-1.webp", "profile-timeline-1.webp"],
  ["async-images/fpwI6wTEgdeTM0rp3FH788/image-2.webp", "profile-timeline-2.webp"],
  ["async-images/fpwI6wTEgdeTM0rp3FH788/image-3.webp", "profile-timeline-3.webp"],
  ["async-images/fpwI6wTEgdeTM0rp3FH788/image-4.webp", "profile-timeline-4.webp"],
  ["async-images/fpwI6wTEgdeTM0rp3FH788/image-5.webp", "profile-timeline-5.webp"],
];

function loadContent() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(root, ".local", "site-content.json"), "utf8"));
    const parsed = zContent.safeParse(raw.published);
    if (parsed.success) return parsed.data;
  } catch {
    /* use the bundled document */
  }
  return buildDefaultContent();
}

function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const build = spawnSync("pnpm", ["exec", "vite", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, VITE_STATIC: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

for (const [destRel, srcName] of MEDIA) {
  const dest = path.join(out, "manus-storage", destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(archive, srcName), dest);
}

const indexPath = path.join(out, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const data = `<script id="pf-data" type="application/json">${safeJson(loadContent())}</script>`;
if (!html.includes('id="pf-data"')) {
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${data}`);
}
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]!] = match[2]!;
  }
  const email = (env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = env.ADMIN_PASSWORD ?? "";
  if (email && password) {
    const gate = {
      emails: [...new Set([email, "harmonicolucas@gmai.com"])],
      passwordSha256: crypto.createHash("sha256").update(password).digest("hex"),
    };
    const tag = `<script id="pf-gate" type="application/json">${safeJson(gate)}</script>`;
    if (!html.includes('id="pf-gate"')) html = html.replace(data, `${tag}\n    ${data}`);
  }
}

fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(out, "404.html"), html);
fs.writeFileSync(path.join(out, ".nojekyll"), "");
for (const route of ["projectos", "en", "en/projects", "admin", "admin/seccoes", "admin/projectos", "admin/perfil", "admin/media", "admin/mensagens", "admin/historico"]) {
  const dir = path.join(out, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

console.log("Static site ready in dist/public");
