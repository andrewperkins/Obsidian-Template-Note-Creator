# Template Note Creator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Obsidian plugin that creates uniquely-prefixed notes with merged frontmatter from multiple user-selected templates.

**Architecture:** Four-file structure: main.ts (plugin lifecycle), settings.ts (settings UI), template-modal.ts (checklist modal), template-utils.ts (frontmatter parsing/merging). Uses Obsidian's native APIs — `vault.create()`, `fileManager.processFrontMatter()`, `vault.process()`, and `Modal`.

**Tech Stack:** TypeScript, Obsidian Plugin API, Moment.js (bundled with Obsidian)

**Design doc:** `docs/plans/2026-02-18-template-note-creator-design.md`

---

### Task 1: Clean up sample plugin code

**Files:**
- Modify: `src/main.ts`
- Modify: `src/settings.ts`
- Modify: `manifest.json`

**Step 1: Update manifest.json**

Change the plugin identity:

```json
{
  "id": "template-note-creator",
  "name": "Template Note Creator",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Create uniquely-prefixed notes with merged frontmatter from multiple templates.",
  "author": "Andrew",
  "isDesktopOnly": false
}
```

**Step 2: Strip main.ts to skeleton**

Replace contents of `src/main.ts` with:

```typescript
import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, TemplateNoteSettings, TemplateNoteSettingTab } from './settings';

export default class TemplateNotePlugin extends Plugin {
  settings: TemplateNoteSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new TemplateNoteSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

**Step 3: Update settings.ts with new interface**

Replace contents of `src/settings.ts` with:

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
import TemplateNotePlugin from './main';

export interface TemplateNoteSettings {
  noteLocation: string;
  templateFolder: string;
  prefixFormat: string;
}

export const DEFAULT_SETTINGS: TemplateNoteSettings = {
  noteLocation: '',
  templateFolder: 'Templates',
  prefixFormat: 'YYYYMMDDHHmm',
};

export class TemplateNoteSettingTab extends PluginSettingTab {
  plugin: TemplateNotePlugin;

  constructor(app: App, plugin: TemplateNotePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Note location')
      .setDesc('Folder where new notes are created. Leave empty for vault root.')
      .addText(text => text
        .setPlaceholder('e.g. Notes/New')
        .setValue(this.plugin.settings.noteLocation)
        .onChange(async (value) => {
          this.plugin.settings.noteLocation = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Template folder')
      .setDesc('Folder containing template files.')
      .addText(text => text
        .setPlaceholder('e.g. Templates')
        .setValue(this.plugin.settings.templateFolder)
        .onChange(async (value) => {
          this.plugin.settings.templateFolder = value;
          await this.plugin.saveSettings();
        }));

    const prefixSetting = new Setting(containerEl)
      .setName('Prefix format')
      .setDesc('Moment.js format string for the filename prefix.')
      .addText(text => text
        .setPlaceholder('e.g. YYYYMMDDHHmm')
        .setValue(this.plugin.settings.prefixFormat)
        .onChange(async (value) => {
          this.plugin.settings.prefixFormat = value;
          await this.plugin.saveSettings();
          previewEl.setText(`Preview: ${window.moment().format(value)}`);
        }));

    const previewEl = prefixSetting.descEl.createDiv({ cls: 'setting-item-description' });
    previewEl.setText(`Preview: ${window.moment().format(this.plugin.settings.prefixFormat)}`);
  }
}
```

**Step 4: Verify it compiles**

Run: `npm run build`
Expected: Clean build with no errors.

**Step 5: Commit**

```bash
git add src/main.ts src/settings.ts manifest.json
git commit -m "feat: scaffold plugin with settings for note location, template folder, prefix format"
```

---

### Task 2: Create template-utils.ts — frontmatter parsing and merging

**Files:**
- Create: `src/template-utils.ts`

**Step 1: Create template-utils.ts**

```typescript
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
  try {
    frontmatter = (parseYaml(match[1]) as Record<string, unknown>) ?? {};
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
      result[key] = [...(result[key] as unknown[]), ...value];
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
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/template-utils.ts
git commit -m "feat: add template parsing and frontmatter merging utilities"
```

---

### Task 3: Create template-modal.ts — the checklist modal

**Files:**
- Create: `src/template-modal.ts`

**Step 1: Create template-modal.ts**

```typescript
import { App, Modal, Setting, TFile, TFolder } from 'obsidian';

export class TemplateSelectModal extends Modal {
  private templateFiles: TFile[];
  private selected: Set<string> = new Set();
  private onSubmit: (selected: TFile[]) => void;

  constructor(app: App, templateFiles: TFile[], onSubmit: (selected: TFile[]) => void) {
    super(app);
    this.templateFiles = templateFiles;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Select templates' });

    for (const file of this.templateFiles) {
      const name = file.basename;
      new Setting(contentEl)
        .setName(name)
        .addToggle(toggle => toggle
          .setValue(false)
          .onChange((value) => {
            if (value) {
              this.selected.add(file.path);
            } else {
              this.selected.delete(file.path);
            }
          }));
    }

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Create Note')
        .setCta()
        .onClick(() => {
          const selectedFiles = this.templateFiles.filter(f => this.selected.has(f.path));
          this.close();
          this.onSubmit(selectedFiles);
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/template-modal.ts
git commit -m "feat: add template selection modal with checklist UI"
```

---

### Task 4: Wire everything together in main.ts

**Files:**
- Modify: `src/main.ts`

**Step 1: Update main.ts with full plugin logic**

Replace `src/main.ts` with:

```typescript
import { moment, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { DEFAULT_SETTINGS, TemplateNoteSettings, TemplateNoteSettingTab } from './settings';
import { TemplateSelectModal } from './template-modal';
import { mergeTemplates, parseTemplate } from './template-utils';

export default class TemplateNotePlugin extends Plugin {
  settings: TemplateNoteSettings;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon('file-plus', 'Create note from templates', () => {
      this.createNoteFromTemplates();
    });

    this.addCommand({
      id: 'create-note-from-templates',
      name: 'Create note from templates',
      callback: () => {
        this.createNoteFromTemplates();
      },
    });

    this.addSettingTab(new TemplateNoteSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private createNoteFromTemplates() {
    const templateFiles = this.getTemplateFiles();
    if (!templateFiles) return;

    new TemplateSelectModal(this.app, templateFiles, async (selected) => {
      await this.buildNote(selected);
    }).open();
  }

  private getTemplateFiles(): TFile[] | null {
    const { templateFolder } = this.settings;
    const folder = this.app.vault.getAbstractFileByPath(templateFolder);

    if (!folder || !(folder instanceof TFolder)) {
      new Notice(`Template folder "${templateFolder}" not found.`);
      return null;
    }

    const files = folder.children
      .filter((f): f is TFile => f instanceof TFile && f.extension === 'md')
      .sort((a, b) => a.basename.localeCompare(b.basename));

    if (files.length === 0) {
      new Notice(`No templates found in "${templateFolder}".`);
      return null;
    }

    return files;
  }

  private async buildNote(selectedTemplates: TFile[]) {
    const { noteLocation, prefixFormat } = this.settings;
    const prefix = moment().format(prefixFormat);
    const fileName = `${prefix} Untitled.md`;
    const filePath = noteLocation ? `${noteLocation}/${fileName}` : fileName;

    // Ensure folder exists
    if (noteLocation) {
      const existing = this.app.vault.getAbstractFileByPath(noteLocation);
      if (!existing) {
        await this.app.vault.createFolder(noteLocation);
      }
    }

    // Parse and merge selected templates
    let initialContent = '';
    if (selectedTemplates.length > 0) {
      const parsed = [];
      for (const file of selectedTemplates) {
        const content = await this.app.vault.read(file);
        parsed.push(parseTemplate(content));
      }
      const merged = mergeTemplates(parsed);

      // Build initial content with body only — frontmatter added via processFrontMatter
      initialContent = merged.body;
    }

    const newFile = await this.app.vault.create(filePath, initialContent);

    // Apply merged frontmatter
    if (selectedTemplates.length > 0) {
      const parsed = [];
      for (const file of selectedTemplates) {
        const content = await this.app.vault.cachedRead(file);
        parsed.push(parseTemplate(content));
      }
      const merged = mergeTemplates(parsed);

      if (Object.keys(merged.frontmatter).length > 0) {
        await this.app.fileManager.processFrontMatter(newFile, (fm) => {
          for (const [key, value] of Object.entries(merged.frontmatter)) {
            fm[key] = value;
          }
        });
      }
    }

    // Open the new note
    const leaf = this.app.workspace.getLeaf();
    await leaf.openFile(newFile);
    new Notice(`Created ${fileName}`);
  }
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: Clean build.

**Step 3: Manual test in Obsidian**

1. Reload the plugin (Ctrl+P → "Reload app without saving" or disable/enable plugin)
2. Create a `Templates` folder with 2-3 test template files containing frontmatter
3. Click the ribbon icon — modal should appear with template checkboxes
4. Select templates, click "Create Note" — new file should appear with merged frontmatter and body

**Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire up template selection, merging, and note creation"
```

---

### Task 5: Refactor — avoid parsing templates twice in buildNote

**Files:**
- Modify: `src/main.ts`

**Step 1: Refactor buildNote to parse templates once**

In `src/main.ts`, replace the `buildNote` method with:

```typescript
private async buildNote(selectedTemplates: TFile[]) {
  const { noteLocation, prefixFormat } = this.settings;
  const prefix = moment().format(prefixFormat);
  const fileName = `${prefix} Untitled.md`;
  const filePath = noteLocation ? `${noteLocation}/${fileName}` : fileName;

  // Ensure folder exists
  if (noteLocation) {
    const existing = this.app.vault.getAbstractFileByPath(noteLocation);
    if (!existing) {
      await this.app.vault.createFolder(noteLocation);
    }
  }

  // Parse and merge selected templates
  let merged = { frontmatter: {} as Record<string, unknown>, body: '' };
  if (selectedTemplates.length > 0) {
    const parsed = [];
    for (const file of selectedTemplates) {
      const content = await this.app.vault.read(file);
      parsed.push(parseTemplate(content));
    }
    merged = mergeTemplates(parsed);
  }

  const newFile = await this.app.vault.create(filePath, merged.body);

  // Apply merged frontmatter
  if (Object.keys(merged.frontmatter).length > 0) {
    await this.app.fileManager.processFrontMatter(newFile, (fm) => {
      for (const [key, value] of Object.entries(merged.frontmatter)) {
        fm[key] = value;
      }
    });
  }

  // Open the new note
  const leaf = this.app.workspace.getLeaf();
  await leaf.openFile(newFile);
  new Notice(`Created ${fileName}`);
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "refactor: parse templates once in buildNote"
```

---

### Task 6: Final cleanup and verify

**Files:**
- Modify: `styles.css` (clear sample styles if any)

**Step 1: Clear styles.css**

Replace with empty file or minimal content:

```css
/* Template Note Creator styles */
```

**Step 2: Full build**

Run: `npm run build`
Expected: Clean build, `main.js` output in project root.

**Step 3: End-to-end manual test**

1. Reload plugin in Obsidian
2. Go to Settings → Template Note Creator — verify all three settings appear with correct defaults and prefix preview
3. Create `Templates` folder with these test files:

`Templates/Daily Log.md`:
```markdown
---
type: daily
tags:
  - journal
mood:
---
## Morning
```

`Templates/Project Tracker.md`:
```markdown
---
type: project
tags:
  - work
  - tracking
status: active
---
## Tasks
```

4. Click ribbon icon → select both templates → Create Note
5. Verify new file has:
   - Filename like `202602181430 Untitled.md`
   - Frontmatter: `type: daily`, `tags: [journal, work, tracking]`, `mood:`, `status: active`
   - Body: `## Morning` then `## Tasks`

**Step 4: Commit**

```bash
git add styles.css
git commit -m "chore: clean up styles"
```
