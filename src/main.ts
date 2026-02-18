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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TemplateNoteSettings>);
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

    // Parse and merge selected templates (single pass)
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
}
