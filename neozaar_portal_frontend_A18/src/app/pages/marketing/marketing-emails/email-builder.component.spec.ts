import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { EmailBuilderComponent } from './email-builder.component';

describe('EmailBuilderComponent', () => {
  let fixture: ComponentFixture<EmailBuilderComponent>;
  let component: EmailBuilderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmailBuilderComponent] }).compileComponents();
    fixture = TestBed.createComponent(EmailBuilderComponent);
    component = fixture.componentInstance;
    component.model = { html: '', text: '' };
    component.ngOnChanges({ model: new SimpleChange(null, component.model, true) });
  });

  it('generates email-safe HTML and a plain-text fallback from blocks', () => {
    component.add('heading');
    component.selected!.content = 'Hello {{first_name}}';
    component.sync();
    expect(component.model.html).toContain('NEOZAAR_BUILDER:');
    expect(component.model.html).toContain('role="presentation"');
    expect(component.model.html).toContain('{{first_name}}');
    expect(component.model.text).toContain('Hello {{first_name}}');
  });

  it('preserves an existing legacy HTML template as an editable HTML block', () => {
    component.model = { html: '<h1>Legacy email</h1>', text: 'Legacy email' };
    component.ngOnChanges({ model: new SimpleChange(null, component.model, false) });
    expect(component.blocks.length).toBe(1);
    expect(component.blocks[0].type).toBe('html');
    expect(component.model.html).toContain('Legacy email');
  });

  it('adds personalization tokens to the selected content block', () => {
    component.add('text');
    component.insertToken('company');
    expect(component.selected!.content).toContain('{{company}}');
    expect(component.model.text).toContain('{{company}}');
  });
});
