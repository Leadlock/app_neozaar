import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../product/product-service.service';
import { ServiceService } from '../../service/service.service';
import { SolutionserviceService } from '../../solution/solutionservice.service';

export interface PickedListing {
  id: number;
  name: string;
  action_type: 'product' | 'service' | 'solution';
  screenshots: string[];
}

// A small, purpose-built picker for the campaign composer — not a reuse of
// selectable-product-list-modal, which turned out to be hardcoded to product/service
// only (no solution support) and built around a brand-first two-step flow specific to
// bundling. Extending that shared component risked regressing product-create/
// service-create, which already depend on it; this stays self-contained instead.
@Component({
  selector: 'app-campaign-listing-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-listing-picker.component.html',
})
export class CampaignListingPickerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() excludeIds: number[] = []; // listings already in the campaign — can't add twice
  @Output() closed = new EventEmitter<PickedListing[] | null>();

  readonly types: ('product' | 'service' | 'solution')[] = ['product', 'service', 'solution'];

  activeType: 'product' | 'service' | 'solution' = 'product';
  searchTerm = '';
  items: any[] = [];
  isLoading = false;
  currentPage = 1;
  totalPages = 1;
  limit = 10;

  selected = new Map<number, PickedListing>();

  constructor(
    private productService: ProductService,
    private serviceService: ServiceService,
    private solutionService: SolutionserviceService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.selected.clear();
      this.searchTerm = '';
      this.currentPage = 1;
      this.activeType = 'product';
      this.loadItems();
    }
  }

  setType(type: 'product' | 'service' | 'solution'): void {
    this.activeType = type;
    this.currentPage = 1;
    this.loadItems();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  private typeParam(): string {
    return this.activeType === 'product' ? 'products' : this.activeType === 'service' ? 'services' : 'solutions';
  }

  loadItems(): void {
    this.isLoading = true;
    const params = { type: this.typeParam(), status: 'Published', page: this.currentPage, limit: this.limit, search: this.searchTerm };
    const request$ =
      this.activeType === 'product' ? this.productService.getProductList(params) :
      this.activeType === 'service' ? this.serviceService.getServiceList(params) :
      this.solutionService.getProductList(params);

    request$.subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.items = (res.data || []).filter((item: any) => !this.excludeIds.includes(item.id));
          this.totalPages = res.pagination?.total_pages ?? 1;
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  isSelected(id: number): boolean {
    return this.selected.has(id);
  }

  toggle(item: any): void {
    if (this.selected.has(item.id)) {
      this.selected.delete(item.id);
    } else {
      this.selected.set(item.id, {
        id: item.id,
        name: item.name,
        action_type: this.activeType,
        screenshots: item.screenshots || [],
      });
    }
  }

  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.loadItems(); } }
  prevPage(): void { if (this.currentPage > 1) { this.currentPage--; this.loadItems(); } }

  confirm(): void {
    if (!this.selected.size) return;
    this.closed.emit(Array.from(this.selected.values()));
  }

  close(): void {
    this.closed.emit(null);
  }
}
