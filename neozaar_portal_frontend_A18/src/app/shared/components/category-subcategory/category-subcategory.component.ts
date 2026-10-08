// import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/common';
import { Component, OnInit, OnChanges, SimpleChanges, inject, signal, Output, Input, EventEmitter, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { ProductService } from '../../../pages/product/product-service.service';

@Component({
  selector: 'app-category-subcategory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-subcategory.component.html',

})
export class CategorySubcategoryComponent implements OnInit, OnChanges {
  private productService = inject(ProductService);
  private fb = inject(FormBuilder);

  @Input() editData?: { category: string[], category_subcategory: string[] };
  @Output() dataChanged = new EventEmitter<{ category: string[], category_subcategory: string[] }>();

  categories = signal<any[]>([]);
  form = this.fb.group({
    selections: this.fb.array([])
  });

  constructor() {
    effect(() => {
      const cats = this.categories();
      if (cats.length > 0 && this.editData?.category?.length) {
        this.patchEditData(cats);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editData'] && this.editData?.category?.length && this.categories().length > 0) {
      this.patchEditData(this.categories());
    }
  }

  ngOnInit() {
    this.loadInitialData();
    this.form.valueChanges.subscribe(() => this.formatAndEmit());
  }

  loadInitialData() {
    this.productService.getcatsubcat().subscribe((res: any) => {
      if (res.status === 'success') {
        this.categories.set(res.data);
        // If not editing, or if editData is empty, start with one empty row
        if (!this.editData || this.editData.category.length === 0) {
          this.addSelection();
        }
      }
    });
  }

  patchEditData(allCategories: any[]) {
    this.selectionArray.clear(); 

    this.editData?.category.forEach(catName => {
      const categoryObj = allCategories.find(c => c.name === catName);
      if (categoryObj) {
        const selectedSubIds = categoryObj.subcategories
          .filter((s: any) => this.editData?.category_subcategory.includes(s.name))
          .map((s: any) => s.id);

        this.selectionArray.push(this.fb.group({
          categoryId: [categoryObj.id.toString(), Validators.required],
          selectedSubIds: [selectedSubIds]
        }));
      }
    });
  }

  get selectionArray() { return this.form.get('selections') as FormArray; }
  get selectionControls() { return this.selectionArray.controls as FormGroup[]; }

  addSelection() {
    const group = this.fb.group({
      categoryId: ['', Validators.required],
      selectedSubIds: [[]]
    });
    this.selectionArray.push(group);
  }

  removeSelection(index: number) {
    if (this.selectionArray.length > 1) {
      this.selectionArray.removeAt(index);
    }
  }

  getSubcategories(categoryId: string | number) {
    const category = this.categories().find(c => c.id === +categoryId);
    return category ? category.subcategories : [];
  }

  onCheckChange(index: number, subId: number, event: any) {
    const control = this.selectionControls[index].get('selectedSubIds');
    const currentValues: number[] = control?.value || [];
    if (event.target.checked) {
      control?.setValue([...currentValues, subId]);
    } else {
      control?.setValue(currentValues.filter(id => id !== subId));
    }
  }

  isSubSelected(index: number, subId: number): boolean {
    const selectedIds = this.selectionControls[index].get('selectedSubIds')?.value || [];
    return selectedIds.includes(subId);
  }

  private formatAndEmit() {
    const categoryNames: string[] = [];
    const subcategoryNames: string[] = [];

    this.selectionArray.value.forEach((sel: any) => {
      const cat = this.categories().find(c => c.id === +sel.categoryId);
      if (cat) {
        if (!categoryNames.includes(cat.name)) categoryNames.push(cat.name);
        sel.selectedSubIds.forEach((id: number) => {
          const sub = cat.subcategories.find((s: any) => s.id === id);
          if (sub) subcategoryNames.push(sub.name);
        });
      }
    });
    this.dataChanged.emit({ category: categoryNames, category_subcategory: subcategoryNames });
  }
}
