import { Component } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [],
  template: `
      <div class="wfull h-full flex justify-center items-center">
        <span class="loading loading-bars loading-lg text-primary-500"></span>
      </div>
  `,
  styles: ``
})
export class LoaderComponent {

}
