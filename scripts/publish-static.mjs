import { copyFile, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const builtHtml = join(projectRoot, "dist", "index.vite.html");
const builtAssets = join(projectRoot, "dist", "assets");
const publicHtml = join(projectRoot, "index.html");
const publicAssets = join(projectRoot, "assets");
const builtManifest = join(projectRoot, "dist", "manifest.webmanifest");
const builtIcons = join(projectRoot, "dist", "icons");
const publicManifest = join(projectRoot, "manifest.webmanifest");
const publicIcons = join(projectRoot, "icons");

await rm(publicAssets, { recursive: true, force: true });
await cp(builtAssets, publicAssets, { recursive: true });
await copyFile(builtHtml, publicHtml);
await copyFile(builtManifest, publicManifest);
await cp(builtIcons, publicIcons, { recursive: true });
