# Template Note Creator — Design

## Overview

An Obsidian plugin that creates a new note with a unique timestamp prefix, then presents a modal where the user selects multiple frontmatter templates to merge into the note.

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `noteLocation` | string | `""` (vault root) | Vault-relative folder for new notes |
| `templateFolder` | string | `"Templates"` | Vault-relative folder containing template files |
| `prefixFormat` | string | `"YYYYMMDDHHmm"` | Moment.js format string for the filename prefix |

Settings tab provides text inputs with folder suggest for the two folder paths, and a text input with live preview for the prefix format.

## Template Modal

- Triggered by ribbon icon or command palette ("Create note from templates")
- Scans `templateFolder` for `.md` files (flat, non-recursive)
- Displays each template as a checkbox row, alphabetically ordered
- User checks one or more templates, clicks "Create Note" to confirm
- If template folder is empty/missing: show notice, don't open modal
- If nothing selected: create blank note

## Note Creation Flow

1. Generate filename: `{moment().format(prefixFormat)} Untitled.md`
2. Ensure `noteLocation` folder exists (create if not)
3. Create the file via `vault.create()`
4. For each selected template (alphabetical order):
   - Parse frontmatter (YAML between `---`) and body (after second `---`)
5. Merge templates:
   - **Frontmatter:** Array values concatenated, scalar values first-wins
   - **Body:** Concatenated in order, separated by newline
6. Write frontmatter via `app.fileManager.processFrontMatter()`, append body via `vault.process()`
7. Open the new note via `workspace.getLeaf().openFile()`

## File Structure

```
src/
  main.ts              — Plugin class, ribbon icon, command registration
  settings.ts          — Settings interface, defaults, settings tab
  template-modal.ts    — TemplateSelectModal (extends Modal)
  template-utils.ts    — parseFrontmatter(), mergeFrontmatter(), mergeTemplates()
```

## Dependencies

None beyond existing `package.json`. Uses Obsidian API: `Modal`, `Setting`, `FolderSuggest`, `moment`, `vault.create()`, `fileManager.processFrontMatter()`.

## Cleanup

Remove all sample plugin demo code (sample modal, sample commands, status bar, click listener, interval).
