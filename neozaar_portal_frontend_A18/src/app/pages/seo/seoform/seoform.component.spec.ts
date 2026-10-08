import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeoformComponent } from './seoform.component';

describe('SeoformComponent', () => {
  let component: SeoformComponent;
  let fixture: ComponentFixture<SeoformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeoformComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeoformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
