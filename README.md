# Template Note Creator

An Obsidian plugin that creates uniquely-prefixed notes with merged frontmatter from multiple templates.

## Features

- **Timestamp-prefixed notes** — each new note gets a unique filename based on a configurable Moment.js format (default: `YYYYMMDDHHmm`)
- **Multi-template selection** — a modal presents all templates as a checklist so you can select multiple at once
- **Frontmatter merging** — selected templates' YAML frontmatter is merged together (arrays are combined and deduplicated, scalar conflicts use first-selected value)
- **Body concatenation** — body content from each selected template is appended in order

## Usage

1. Click the `+` ribbon icon or run **Create note from templates** from the command palette
2. Toggle the templates you want to include
3. Click **Create Note**

A new note is created with the merged frontmatter and body content, and opened in a new tab.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Note location** | Folder where new notes are created | Vault root |
| **Template folder** | Folder containing template `.md` files | `Templates` |
| **Prefix format** | Moment.js format string for the filename | `YYYYMMDDHHmm` |

## Installation

### BRAT (recommended for beta testing)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin
2. Open Settings > BRAT > Add Beta plugin
3. Enter `andrewperkins/Obsidian-Template-Note-Creator`

### Manual

Copy `main.js`, `manifest.json`, and `styles.css` to your vault at `.obsidian/plugins/template-note-creator/`.
