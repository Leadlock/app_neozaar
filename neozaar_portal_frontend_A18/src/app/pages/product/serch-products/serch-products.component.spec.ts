import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchProductsComponent } from './serch-products.component';

describe('SerchProductsComponent', () => {
  let component: SearchProductsComponent;
  let fixture: ComponentFixture<SearchProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
