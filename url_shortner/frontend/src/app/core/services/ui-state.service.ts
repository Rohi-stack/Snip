import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  isCreateLinkModalOpen = signal(false);

  openCreateLinkModal() {
    this.isCreateLinkModalOpen.set(true);
  }

  closeCreateLinkModal() {
    this.isCreateLinkModalOpen.set(false);
  }
}
