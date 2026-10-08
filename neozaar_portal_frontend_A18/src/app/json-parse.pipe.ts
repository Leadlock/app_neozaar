import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jsonParse',
  standalone: true
})
export class JsonParsePipe implements PipeTransform {

  transform(value: any): string[] {
    if (!value) return [];

    try {
      return typeof value === 'string'
        ? JSON.parse(value)
        : value;
    } catch {
      return [];
    }
  }

}
