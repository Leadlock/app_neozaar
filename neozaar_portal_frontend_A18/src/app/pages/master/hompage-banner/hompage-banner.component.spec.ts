import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HompageBannerComponent } from './hompage-banner.component';

describe('HompageBannerComponent', () => {
  let component: HompageBannerComponent;
  let fixture: ComponentFixture<HompageBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HompageBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HompageBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
