import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs';
@Component({
  selector: 'app-serch-products',
  standalone: true,
  imports: [ FormsModule, ReactiveFormsModule, ],
  templateUrl: './serch-products.component.html',
})
export class SearchProductsComponent implements OnInit {
   productForm!: FormGroup;
  selectedFields = [
    {
      slug: 'color',
      options: ['Red', 'Green', 'Blue', 'Black', 'White', 'Yellow']
    },
    {
      slug: 'size',
      options: ['Small', 'Medium', 'Large', 'Extra Large']
    },
      {
      slug: 'Height',
      options: ['Small', 'Medium', 'Large', 'Extra Large']
    }
  ];

  searchControls: { [key: string]: FormControl } = {};
  filteredOptions: { [key: string]: string[] } = {};

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.productForm = this.fb.group({
      taxonomy_data: this.fb.group({})
    });

    const taxonomyGroup = this.productForm.get('taxonomy_data') as FormGroup;

    this.selectedFields.forEach(field => {
      // Set default selected values
      taxonomyGroup.addControl(field.slug, this.fb.control([]));

      // Init debounced search for each field
      this.initBackendSearch(field.slug, field.options);
    });
  }

  initBackendSearch(fieldSlug: string, allOptions: string[]) {
    if (!this.searchControls[fieldSlug]) {
    const control = new FormControl('');
    this.searchControls[fieldSlug] = control;

    control.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
        filter((text): text is string => text !== null && text !== undefined),
      switchMap((searchText: string) => {
        if (!searchText?.trim()) return of([]);
        return this.mockBackendSearch(fieldSlug, searchText, allOptions);
      })
    ).subscribe((options: string[]) => {
      const selected = this.taxonomy_data.get(fieldSlug)?.value || [];
      this.filteredOptions[fieldSlug] = options.filter(opt => !selected.includes(opt));
    });
  }
  }

  // Simulates a backend API search
  mockBackendSearch(slug: string, query: string, options: string[]) {
    // Simulated backend filter
    return of(
      options.filter(opt =>
        opt.toLowerCase().includes(query.toLowerCase())
      )
    );
  }

  get taxonomy_data() {
    return this.productForm.get('taxonomy_data') as FormGroup;
  }

  toggleChip(fieldSlug: string, option: string) {
    const current = this.taxonomy_data.get(fieldSlug)?.value || [];
    const updated = current.includes(option)
      ? current.filter((val: string) => val !== option)
      : [...current, option];
    this.taxonomy_data.get(fieldSlug)?.setValue(updated);
    this.taxonomy_data.get(fieldSlug)?.markAsTouched();
  }

  removeTag(fieldSlug: string, tag: string) {
    const current = this.taxonomy_data.get(fieldSlug)?.value || [];
    const updated = current.filter((val: string) => val !== tag);
    this.taxonomy_data.get(fieldSlug)?.setValue(updated);
    this.taxonomy_data.get(fieldSlug)?.markAsTouched();
  }

  // Check if input value should trigger + button
shouldShowAddButton(fieldSlug: string): boolean {
  const inputValue = this.searchControls[fieldSlug]?.value?.trim();
  if (!inputValue) return false;

  const selected = this.taxonomy_data.get(fieldSlug)?.value || [];
  const options = this.filteredOptions[fieldSlug] || [];

  // Show + only if value is NOT in filtered options or selected
  return !options.includes(inputValue) && !selected.includes(inputValue);
}

// Add the typed value as a new tag
addNewOption(fieldSlug: string) {
  const inputValue = this.searchControls[fieldSlug]?.value?.trim();
  if (!inputValue) return;

  const current = this.taxonomy_data.get(fieldSlug)?.value || [];
  const updated = [...current, inputValue];

  this.taxonomy_data.get(fieldSlug)?.setValue(updated);
  this.taxonomy_data.get(fieldSlug)?.markAsTouched();

  // Optionally clear search input after adding
  this.searchControls[fieldSlug].setValue('');
}


submit() {
  const formData = new FormData();

  // Flatten taxonomy_data values into JSON
  const taxonomy = this.productForm.get('taxonomy_data')?.value || {};

  // Add each selected field value (as JSON string if it's an array)
  console.log(taxonomy);
  
  for (const slug of Object.keys(taxonomy)) {
    if (Array.isArray(taxonomy[slug])) {
      formData.append(slug, JSON.stringify(taxonomy[slug]));
    } else {
      formData.append(slug, taxonomy[slug]);
    }
  }
  console.log('FormData submitted:');
    console.log(formData);
 for (const [key, value] of (formData as any).entries()) {
  console.log(`${key}: ${value}`);
}
  
}


}
