import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent implements OnInit, OnDestroy {
  @Input() imageFormArray!: FormArray;
  maxImages = 5;

  imagePreviews: string[] = [];

  ngOnInit(): void {
    // Preload existing images (URLs from backend)
    this.imageFormArray.controls.forEach(ctrl => {
      const val = ctrl.value;

      if (typeof val === 'string') {
        this.imagePreviews.push(val);
      }

      if (val instanceof File) {
        const url = URL.createObjectURL(val);
        this.imagePreviews.push(url);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // ✅ Allow ANY image type
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 2 * 1024 * 1024; // 2MB

      const isDuplicate = this.imageFormArray.controls.some(ctrl => {
        const val = ctrl.value;
        return val instanceof File &&
               val.name === file.name &&
               val.size === file.size;
      });

      if (!isValidType) {
        alert(`Only image files allowed: ${file.name}`);
        continue;
      }

      if (!isValidSize) {
        alert(`File too large (max 2MB): ${file.name}`);
        continue;
      }

      if (isDuplicate) {
        alert(`Duplicate file skipped: ${file.name}`);
        continue;
      }

      if (this.imageFormArray.length < this.maxImages) {
        this.imageFormArray.push(new FormControl(file));
        const url = URL.createObjectURL(file);
        this.imagePreviews.push(url);
      } else {
        alert(`Max ${this.maxImages} images allowed`);
        break;
      }
    }

    input.value = '';
  }

  removeImage(index: number): void {
    const val = this.imageFormArray.at(index).value;

    if (val instanceof File) {
      URL.revokeObjectURL(this.imagePreviews[index]);
    }

    this.imageFormArray.removeAt(index);
    this.imagePreviews.splice(index, 1);
  }

  ngOnDestroy(): void {
    this.imagePreviews.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }
}
