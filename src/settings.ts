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
