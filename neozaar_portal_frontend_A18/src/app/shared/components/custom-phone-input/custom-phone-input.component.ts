import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Country {
  name: string;
  code: string;
  flag: string;
  minLength: number;
  maxLength: number;
}

@Component({
  selector: 'app-custom-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-phone-input.component.html',
  styleUrls: ['./custom-phone-input.component.css']
})
export class CustomPhoneInputComponent implements OnChanges {

  /** ✅ Allow parent to pass phone number for edit mode */
  @Input() phoneNumber: string | null = null;

  countries: Country[] = [
    { name: 'India', code: '+91', flag: '🇮🇳', minLength: 10, maxLength: 10 },
    { name: 'United States', code: '+1', flag: '🇺🇸', minLength: 10, maxLength: 10 },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧', minLength: 10, maxLength: 11 },
    // ... keep your full list here
  ];

  filteredCountries: Country[] = [...this.countries];
  selectedCountry: Country | null = null;
  inputValue = '';
  validationMessage = '';
  showDropdown = false;

  // ✅ Detect input change from parent (edit mode)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['phoneNumber'] && this.phoneNumber) {
      this.setInitialNumber(this.phoneNumber);
    }
  }

  /** ✅ Set number on edit mode */
  setInitialNumber(fullNumber: string) {
    this.inputValue = fullNumber.trim();

    // Detect the country by matching dialing code
    const match = this.countries.find(c => fullNumber.startsWith(c.code));
    if (match) {
      this.selectedCountry = match;
    }

    // Validate once loaded
    this.validateNumber();
  }

  /** 🔍 Handles typing */
  onInputChange() {
    const query = this.inputValue.trim();

    if (query.startsWith('+')) {
      const match = this.countries.find(c => query.startsWith(c.code));
      if (match && (!this.selectedCountry || this.selectedCountry.code !== match.code)) {
        this.selectedCountry = match;
        this.showDropdown = false;
      }
    } else {
      const lower = query.toLowerCase();
      this.filteredCountries = this.countries.filter(
        c =>
          c.name.toLowerCase().includes(lower) ||
          c.flag.includes(query) ||
          c.code.includes(query.replace(/\s/g, ''))
      );
      this.showDropdown = this.filteredCountries.length > 0;
    }

    this.validateNumber();
  }

  /** ✅ Select a country */
  selectCountry(country: Country) {
    this.selectedCountry = country;
    const digits = this.inputValue.replace(/\D/g, '');
    if (!this.inputValue.startsWith(country.code)) {
      this.inputValue = `${country.code} ${digits}`;
    }
    this.showDropdown = false;
  }

  /** ✅ Allow only +, digits, space */
  allowOnlyValidKeys(event: KeyboardEvent) {
    const allowed = /[0-9+ ]/;
    if (
      !allowed.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }
  }

  /** ✅ Validate */
  validateNumber() {
    if (!this.selectedCountry) {
      this.validationMessage = '';
      return;
    }

    const digits = this.inputValue.replace(/\D/g, '');
    const codeDigits = this.selectedCountry.code.replace('+', '');
    const numberPart = digits.startsWith(codeDigits)
      ? digits.substring(codeDigits.length)
      : digits;

    const len = numberPart.length;
    const { minLength, maxLength, name, code } = this.selectedCountry;

    if (len === 0) {
      this.validationMessage = '';
      return;
    }

    if (len < minLength) {
      this.validationMessage = `⚠️ Too short for ${name}. Expected ${minLength}-${maxLength} digits.`;
    } else if (len > maxLength) {
      this.validationMessage = `⚠️ Too long for ${name}. Expected ${minLength}-${maxLength} digits.`;
    } else {
      this.validationMessage = `✅ Valid ${name} number: ${code} ${numberPart}`;
    }
  }
}
