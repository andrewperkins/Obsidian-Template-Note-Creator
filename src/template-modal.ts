import { App, Modal, Setting, TFile } from 'obsidian';

export class TemplateSelectModal extends Modal {
  private templateFiles: TFile[];
  private selected: Set<string> = new Set();
  private onSubmit: (selected: TFile[]) => void;

  private prechecked: Set<string>;

  constructor(app: App, templateFiles: TFile[], onSubmit: (selected: TFile[]) => void, prechecked: string[] = []) {
    super(app);
    this.templateFiles = templateFiles;
    this.onSubmit = onSubmit;
    this.prechecked = new Set(prechecked);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Select templates' });

    const createButton = (container: HTMLElement) => {
      new Setting(container)
        .addButton(btn => btn
          .setButtonText('Create Note')
          .setCta()
          .onClick(() => {
            const selectedFiles = this.templateFiles.filter(f => this.selected.has(f.path));
            this.close();
            this.onSubmit(selectedFiles);
          }));
    };

    createButton(contentEl);

    for (const file of this.templateFiles) {
      const name = file.basename;
      const isChecked = this.prechecked.has(name);
      if (isChecked) {
        this.selected.add(file.path);
      }
      new Setting(contentEl)
        .setName(name)
        .addToggle(toggle => toggle
          .setValue(isChecked)
          .onChange((value) => {
            if (value) {
              this.selected.add(file.path);
            } else {
              this.selected.delete(file.path);
            }
          }));
    }

    createButton(contentEl);
  }

  onClose() {
    this.contentEl.empty();
  }
}
