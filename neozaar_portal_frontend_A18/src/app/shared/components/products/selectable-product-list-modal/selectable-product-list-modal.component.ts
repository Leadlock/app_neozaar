import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../pages/product/product-service.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-selectable-product-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './selectable-product-list-modal.component.html',
  styleUrl: './selectable-product-list-modal.component.css'
})
export class SelectableProductListModalComponent {
  @ViewChild('modal') modal!: ElementRef<HTMLDialogElement>;
  @Input() isOpen: boolean = false;
  @Input() type: string = '';
  @Input() categoryData: any[] = [];
  @Output() closeModalemmit = new EventEmitter<any>();

  // Step control: 'brands' | 'products'
  step: 'brands' | 'products' = 'brands';

  // Brand step
  brands: any[] = [];
  brandSearch: string = '';
  isFetchingBrands: boolean = false;
  selectedBrand: any = null;

  // Product step
  productList: any[] = [];
  isFetchingProducts: boolean = false;
  searchTerm: string = '';
  currentPage: number = 1;
  totalPages: number = 1;
  totalProducts: number = 0;
  limit: number = 10;

  // Accumulated selections across all brands
  selectedProducts: any[] = [];

  get isService(): boolean {
    return this.type === 'service' || this.type === 'services';
  }

  get filteredBrands(): any[] {
    if (!this.brandSearch.trim()) return this.brands;
    const q = this.brandSearch.toLowerCase();
    return this.brands.filter(b => b.brand_name?.toLowerCase().includes(q));
  }

  constructor(private productService: ProductService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.step = 'brands';
      this.selectedBrand = null;
      this.searchTerm = '';
      this.brandSearch = '';
      if (this.categoryData?.length > 0) {
        this.selectedProducts = [...this.categoryData];
      }
      this.loadBrands();
      setTimeout(() => {
        this.modal?.nativeElement?.showModal();
      }, 0);
    }
  }

  loadBrands(): void {
    this.isFetchingBrands = true;
    const listType = this.isService ? 'services' : 'products';
    // Fetch published items and extract unique brands
    this.productService.getProductList({
      type: listType,
      status: 'Published',
      limit: 200
    }).pipe(finalize(() => { this.isFetchingBrands = false; }))
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            const items: any[] = res.data ?? [];
            // Extract unique brands from published items
            const brandMap = new Map<string, any>();
            items.forEach(item => {
              const key = item.brand_name || item.brand;
              if (key && !brandMap.has(key)) {
                brandMap.set(key, {
                  brand_name: key,
                  logo: item.product_logo || item.logo || null
                });
              }
            });
            this.brands = Array.from(brandMap.values());
          }
        },
        error: (err: any) => console.error('Error loading brands:', err)
      });
  }

  selectBrand(brand: any): void {
    this.selectedBrand = brand;
    this.step = 'products';
    this.currentPage = 1;
    this.searchTerm = '';
    this.loadProducts();
  }

  backToBrands(): void {
    this.step = 'brands';
    this.selectedBrand = null;
    this.productList = [];
  }

  loadProducts(): void {
    this.isFetchingProducts = true;
    const listType = this.isService ? 'services' : 'products';
    this.productService.getProductList({
      type: listType,
      status: 'Published',
      brand: this.selectedBrand?.brand_name,
      search: this.searchTerm,
      page: this.currentPage,
      limit: this.limit
    }).pipe(finalize(() => { this.isFetchingProducts = false; }))
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.productList = res.data ?? [];
            this.totalProducts = res.pagination?.total ?? 0;
            this.totalPages = res.pagination?.total_pages ?? 1;
          }
        },
        error: (err: any) => console.error('Error loading products:', err)
      });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  isSelected(id: number): boolean {
    return this.selectedProducts.some(p => p.id === id);
  }

  toggleProduct(e: Event, product: any): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.isSelected(product.id)) this.selectedProducts.push(product);
    } else {
      this.selectedProducts = this.selectedProducts.filter(p => p.id !== product.id);
    }
  }

  confirm(): void {
    if (this.selectedProducts.length === 0) {
      alert('Please select at least one item');
      return;
    }
    this.modal?.nativeElement?.close();
    this.closeModalemmit.emit(this.selectedProducts);
  }

  close(): void {
    this.modal?.nativeElement?.close();
    this.closeModalemmit.emit(null);
  }
}
