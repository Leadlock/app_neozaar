import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-upload.component.html'
})
export class FileUploadComponent implements OnInit {
  @Input() attachmentsFormArray!: FormArray;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (!this.attachmentsFormArray) {
      this.attachmentsFormArray = this.fb.array([]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    const maxFileSizeKB = 3072; // 3MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if ((file.size / 1024) > maxFileSizeKB) {
        alert(`File "${file.name}" is too large.`);
        continue;
      }
      this.attachmentsFormArray.push(new FormControl(file));
    }
    input.value = '';
  }

  // HELPER: Get clean name from SkillLadders URL or File object
 // file-upload.component.ts
// parent.component.ts


getDisplayFileName(file: any): string {
  if (!file) return 'No File';

  // If it's a File object (New Upload)
  if (file instanceof File) return file.name;

  // If it's the URL string from your API
  if (typeof file === 'string') {
    // 1. Get the part after the last '/'
    const fullName = file.split('/').pop() || '';
    
    // 2. Remove the SkillLadders timestamp prefix (1770969902955_7844_)
    // Logic: Split by underscore and skip the first two parts
    const parts = fullName.split('_');
    if (parts.length > 2) {
      return parts.slice(2).join('_'); // Returns "ResumeMeenakumariGujari.pdf"
    }
    return fullName;
  }

  return 'Document';
}

  // HELPER: Fixes the Parser Error by moving logic out of HTML
  getFileUrl(file: any): string {
    if (file instanceof File) return '#';
    return typeof file === 'string' ? file : '#';
  }

  // HELPER: Checks if it's a new upload
  isNewFile(file: any): boolean {
    return file instanceof File;
  }

  removeFile(index: number): void {
    this.attachmentsFormArray.removeAt(index);
  }
}
