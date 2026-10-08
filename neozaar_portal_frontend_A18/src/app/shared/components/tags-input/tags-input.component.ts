import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Reusable free-form tag input (chips) used on the product / service / solution
 * create & edit forms. Admin/ISV can type any tag and press Enter or comma to
 * add it; click the × to remove. Tags are plain strings, de-duplicated and
 * trimmed. Two-way bind with [(tags)].
 */
@Component({
  selector: 'app-tags-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tags-input.component.html',
  styleUrl: './tags-input.component.css',
})
export class TagsInputComponent {
  /** The current list of tags. Two-way bindable via [(tags)]. */
  @Input() tags: string[] = [];
  @Output() tagsChange = new EventEmitter<string[]>();

  @Input() placeholder = 'Type a tag and press Enter';
  @Input() disabled = false;

  inputValue = '';

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;
    // Enter or comma commits the current token.
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commit(this.inputValue);
      return;
    }
    // Backspace on an empty input removes the last chip.
    if (event.key === 'Backspace' && this.inputValue === '' && this.tags.length) {
      this.removeAt(this.tags.length - 1);
    }
  }

  onBlur(): void {
    // Commit whatever is left when focus leaves, so a typed-but-not-entered
    // tag is not silently lost on save.
    if (this.inputValue.trim()) {
      this.commit(this.inputValue);
    }
  }

  /** Split on commas so pasting "a, b, c" adds three chips. */
  private commit(raw: string): void {
    const parts = (raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (!parts.length) {
      this.inputValue = '';
      return;
    }

    const next = [...this.tags];
    for (const p of parts) {
      const exists = next.some((t) => t.toLowerCase() === p.toLowerCase());
      if (!exists) next.push(p);
    }
    this.tags = next;
    this.tagsChange.emit(this.tags);
    this.inputValue = '';
  }

  removeAt(index: number): void {
    if (this.disabled) return;
    const next = this.tags.filter((_, i) => i !== index);
    this.tags = next;
    this.tagsChange.emit(this.tags);
  }
}
