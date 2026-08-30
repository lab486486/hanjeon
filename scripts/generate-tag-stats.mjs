import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const benefitsDir = path.join(root, "src/content/benefits");
const outFile = path.join(root, "public/admin/tag-stats.json");

function extractCategory(fm) {
  const m = fm.match(/^category:\s*(.+?)\s*$/m);
  if (!m) return "";
  return m[1].replace(/^["']|["']$/g, "").trim();
}

function main() {
  const counts = new Map();
  if (fs.existsSync(benefitsDir)) {
    for (const file of fs.readdirSync(benefitsDir)) {
      if (!file.endsWith(".md")) continue;
      const text = fs.readFileSync(path.join(benefitsDir, file), "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const name = extractCategory(fm[1]);
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), tags }, null, 2) + "\n",
  );
  console.log(`tag-stats: ${tags.length} categories → ${path.relative(root, outFile)}`);
}

main();
