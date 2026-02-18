import { parseYaml } from 'obsidian';

export interface ParsedTemplate {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseTemplate(content: string): ParsedTemplate {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(fmRegex);

  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  let frontmatter: Record<string, unknown> = {};
  const raw = match[1] ?? '';
  try {
    frontmatter = (parseYaml(raw) as Record<string, unknown>) ?? {};
  } catch {
    frontmatter = {};
  }

  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
}

export function mergeFrontmatter(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (!(key in result)) {
      result[key] = value;
    } else if (Array.isArray(result[key]) && Array.isArray(value)) {
      const merged = [...(result[key] as unknown[]), ...value];
      result[key] = [...new Set(merged)];
    }
    // scalar conflict: first wins, do nothing
  }
  return result;
}

export function mergeTemplates(templates: ParsedTemplate[]): ParsedTemplate {
  let frontmatter: Record<string, unknown> = {};
  const bodies: string[] = [];

  for (const tpl of templates) {
    frontmatter = mergeFrontmatter(frontmatter, tpl.frontmatter);
    if (tpl.body) {
      bodies.push(tpl.body);
    }
  }

  return { frontmatter, body: bodies.join('\n\n') };
}
