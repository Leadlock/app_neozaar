import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketplaceServiceComponent } from './marketplace-service.component';

describe('MarketplaceServiceComponent', () => {
  let component: MarketplaceServiceComponent;
  let fixture: ComponentFixture<MarketplaceServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarketplaceServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
