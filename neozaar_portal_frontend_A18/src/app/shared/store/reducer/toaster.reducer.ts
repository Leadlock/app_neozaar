import { createReducer, on } from '@ngrx/store';
import { addToast, removeToast } from '../action/toaster.action';
import { Toaster } from '../model/toaster.model';

export const initialState: Toaster[] = [];

export const toastReducer = createReducer(
  initialState,
  on(addToast, (state, { toast }) => [...state, toast]),
  on(removeToast, (state, { id }) => state.filter(toast => toast.id !== id))
);
