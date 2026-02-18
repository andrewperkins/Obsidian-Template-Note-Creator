import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, TemplateNoteSettings, TemplateNoteSettingTab } from './settings';

export default class TemplateNotePlugin extends Plugin {
  settings: TemplateNoteSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new TemplateNoteSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TemplateNoteSettings>);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
