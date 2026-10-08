import { createAction, props } from '@ngrx/store';
import { Toaster } from '../model/toaster.model';

export const addToast = createAction(
  '[Toast] Add Toast',
  props<{ toast: Toaster }>()
);

export const removeToast = createAction(
  '[Toast] Remove Toast',
  props<{ id: string }>()
);
