import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat',
  standalone: true
})
export class PhoneFormatPipe implements PipeTransform {
  transform(value: string | number, countryCode: string = '+91'): string {
    if (!value) return '';
    const cleaned = value.toString().replace(/\D/g, ''); // remove non-digits
    const match = cleaned.match(/^(\d{5})(\d{5})$/);
    if (match) {
      return `${countryCode} ${match[1]} ${match[2]}`;
    }
    return value.toString(); // fallback
  }
}
