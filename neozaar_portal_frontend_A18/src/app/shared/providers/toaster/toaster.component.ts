import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Toaster } from '../../store/model/toaster.model';
import { removeToast } from '../../store/action/toaster.action';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toaster.component.html',
  styleUrl: './toaster.component.scss'
})
export class ToasterComponent {

toasterBodies$: Observable<Toaster[]>;

constructor(private store: Store<{ toasts: Toaster[] }>) {
  this.toasterBodies$ = this.store.select(state => state.toasts);
}


  closeToaster(id: string) {
    this.store.dispatch(removeToast({ id }));
  }

}
