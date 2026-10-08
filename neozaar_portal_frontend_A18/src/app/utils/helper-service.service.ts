import { ElementRef, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HelperServiceService {

  constructor() { }

  getImageFileAndUrl(event: Event): { image: File | null; imageUrl: string | null } {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const image = input.files[0];
      const imageUrl = URL.createObjectURL(image);
      return { image, imageUrl };
    }
    return { image: null, imageUrl: null };
  }






}
