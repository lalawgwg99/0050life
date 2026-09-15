import { copyFile, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const builtHtml = join(projectRoot, "dist", "index.vite.html");
const builtAssets = join(projectRoot, "dist", "assets");
const publicHtml = join(projectRoot, "index.html");
const publicAssets = join(projectRoot, "assets");

await rm(publicAssets, { recursive: true, force: true });
await cp(builtAssets, publicAssets, { recursive: true });
await copyFile(builtHtml, publicHtml);
