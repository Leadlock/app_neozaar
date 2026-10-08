import { effect, inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { addToast, removeToast } from '../action/toaster.action';
import { delay, filter, map, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Toaster } from '../model/toaster.model';

@Injectable()
export class ToastEffects {
autoRemoveToast$;

  constructor(private actions$: Actions,private store: Store<{ toasts: Toaster[] }>) {
    this.autoRemoveToast$ = createEffect(() =>
      this.actions$.pipe(
        ofType(addToast),
        delay(5000),
        withLatestFrom(this.store.select(state => state.toasts)),
      filter(([action, toasts]) => {
        // Only remove if toast with the same ID still exists
        return toasts.some(t => t.id === action.toast.id);
      }),
        map(([action]) => removeToast({ id: action.toast.id }))
      )
    );
  }
}
