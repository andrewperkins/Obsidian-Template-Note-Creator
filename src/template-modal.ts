import { App, Modal, Setting, TFile } from 'obsidian';

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
