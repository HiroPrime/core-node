import fs from "fs";
import path from "path";

export type Note = {
  slug: string;
  title: string;
  date: string;
  body: string;
};

const NOTES_DIR = path.join(process.cwd(), "content", "notes");

function parse(raw: string): { title: string; date: string; body: string } {
  const match = raw.replaceAll("\r\n", "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { title: "Untitled", date: "", body: raw.trim() };
  }
  const meta = Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.split(/:\s(.*)/).filter(Boolean))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key.trim(), value.trim()]),
  );
  return {
    title: meta.title || "Untitled",
    date: meta.date || "",
    body: match[2].trim(),
  };
}

export function allNotes(): Note[] {
  if (!fs.existsSync(NOTES_DIR)) return [];
  return fs
    .readdirSync(NOTES_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const slug = name.replace(/\.md$/, "");
      const parsed = parse(fs.readFileSync(path.join(NOTES_DIR, name), "utf8"));
      return { slug, ...parsed };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getNote(slug: string): Note | null {
  return allNotes().find((note) => note.slug === slug) ?? null;
}

export function renderNote(body: string): string {
  const escaped = body
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2>${inline(block.slice(3))}</h2>`;
      }
      return `<p>${inline(block).replaceAll("\n", "<br />")}</p>`;
    })
    .join("");
}

function inline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
