import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WhatsappLogService } from '../../core/services/whatsapp-log.service';

/**
 * WhatsApp conversation log — admin, SUPER_ADMIN only.
 * Left: every number that has messaged Neo. Right: the full transcript.
 */
@Component({
  selector: 'app-whatsapp-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './whatsapp-conversations.component.html',
})
export class WhatsappConversationsComponent implements OnInit, OnDestroy {
  private api = inject(WhatsappLogService);

  stats: any = null;

  contacts: any[] = [];
  loadingContacts = false;
  search = '';
  optedOut = '';
  inboxFilter = '';
  draft = '';
  actionBusy = false;
  actionError = '';
  private refreshTimer: any;
  private conversationRequest = 0;
  private contactsRequest = 0;
  page = 1;
  pagination: any = { page: 1, pages: 1, total: 0 };
  private searchTimer: any;

  selected: any = null;
  messages: any[] = [];
  loadingConv = false;
  hasMore = false;
  nextBefore: number | null = null;

  deleteFor: any = null;
  deleteReason = '';
  deleteAlsoContact = false;
  deleting = false;

  ngOnInit(): void {
    this.api.getStats().subscribe({ next: (r) => (this.stats = r.data), error: () => {} });
    this.loadContacts();
    this.refreshTimer = setInterval(() => {
      if (document.visibilityState !== 'visible' || this.actionBusy) return;
      this.loadContacts();
      this.api.getStats().subscribe({ next: r => this.stats = r.data, error: () => {} });
      if (this.selected && !this.loadingConv) this.loadConversation(false, true);
    }, 10000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
    clearTimeout(this.searchTimer);
    this.conversationRequest++;
    this.contactsRequest++;
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      this.loadContacts();
    }, 300);
  }

  loadContacts(): void {
    const request = ++this.contactsRequest;
    this.loadingContacts = true;
    this.api
      .getContacts({ q: this.search, page: this.page, limit: 30,
        opted_out: this.inboxFilter === 'opted_out' ? 'true' : this.optedOut,
        mode: ['HUMAN', 'BOT'].includes(this.inboxFilter) ? this.inboxFilter : '',
        unread: this.inboxFilter === 'unread' ? 'true' : '',
        leads: this.inboxFilter === 'leads' ? 'true' : '' })
      .subscribe({
        next: (r) => {
          if (request !== this.contactsRequest) return;
          this.contacts = r.data || [];
          this.pagination = r.pagination || this.pagination;
          this.loadingContacts = false;
        },
        error: () => (this.loadingContacts = false),
      });
  }

  gotoPage(p: number): void {
    if (p < 1 || p > this.pagination.pages) return;
    this.page = p;
    this.loadContacts();
  }

  openContact(c: any): void {
    if (this.actionBusy) return;
    this.draft = '';
    this.actionError = '';
    this.selected = c;
    this.messages = [];
    this.nextBefore = null;
    this.hasMore = false;
    this.loadConversation();
  }

  loadConversation(older = false, refresh = false): void {
    if (!this.selected) return;
    const phone = this.selected.phone;
    const request = ++this.conversationRequest;
    this.loadingConv = true;
    const params: any = { limit: 50 };
    if (older && this.nextBefore) params.before = this.nextBefore;
    this.api.getConversation(this.selected.phone, params).subscribe({
      next: (r) => {
        if (request !== this.conversationRequest || this.selected?.phone !== phone) return;
        this.selected = { ...this.selected, ...(r.contact || {}) };
        if (refresh) {
          const byId = new Map(this.messages.map(m => [String(m.id), m]));
          for (const m of r.messages || []) byId.set(String(m.id), m);
          this.messages = Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id));
        } else {
          this.messages = older ? [...(r.messages || []), ...this.messages] : r.messages || [];
          this.hasMore = !!r.has_more;
          this.nextBefore = r.next_before ?? null;
        }
        this.loadingConv = false;
        const inbound = [...(r.messages || [])].reverse().find((m: any) => m.direction === 'in');
        if (!older && this.selected.unread && inbound && document.visibilityState === 'visible') {
          this.api.agentAction(phone, 'read', { through_id: inbound.id }).subscribe({
            next: result => {
              if (this.selected?.phone === phone && request === this.conversationRequest) this.selected.unread = result.data.unread;
              this.loadContacts();
              this.api.getStats().subscribe({ next: s => this.stats = s.data, error: () => {} });
            },
            error: e => { if (this.selected?.phone === phone) this.actionError = e.error?.message || 'Could not mark conversation read'; }
          });
        }
      },
      error: () => { if (request === this.conversationRequest) this.loadingConv = false; },
    });
  }

  get sendBlockedReason(): string {
    if (this.selected?.conversation_mode !== 'HUMAN') return 'Take over the conversation to send a message.';
    if (this.selected?.opted_out) return 'Customer has opted out. Sending is blocked.';
    if (!this.selected?.window_active) return 'Customer-service window expired. An approved WhatsApp template may be required.';
    return '';
  }

  control(action: 'takeover' | 'release' | 'messages'): void {
    if (!this.selected || this.actionBusy) return;
    if (action === 'messages' && (this.sendBlockedReason || !this.draft.trim() || this.draft.length > 4096)) return;
    const phone = this.selected.phone;
    this.actionBusy = true;
    this.actionError = '';
    this.api.agentAction(phone, action, action === 'messages' ? { message: this.draft } : {}).subscribe({
      next: r => {
        this.actionBusy = false;
        if (this.selected?.phone !== phone) return;
        if (action === 'messages') this.draft = '';
        else this.selected = { ...this.selected, ...r.data };
        this.actionError = r.data?.warning || '';
        this.loadConversation(false, true);
        this.loadContacts();
      },
      error: e => {
        this.actionBusy = false;
        this.actionError = e.error?.message || 'Action failed. Refresh before retrying.';
        if (this.selected?.phone === phone) this.loadConversation(false, true);
      }
    });
  }

  exportConv(fmt: 'csv' | 'json'): void {
    if (!this.selected) return;
    this.api.exportConversation(this.selected.phone, fmt).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wa_${this.selected.phone}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  askDelete(c: any): void {
    this.deleteFor = c;
    this.deleteReason = '';
    this.deleteAlsoContact = false;
  }

  confirmDelete(): void {
    if (!this.deleteFor) return;
    this.deleting = true;
    this.api
      .deleteConversation(this.deleteFor.phone, {
        contact: this.deleteAlsoContact,
        reason: this.deleteReason,
      })
      .subscribe({
        next: () => {
          this.deleting = false;
          const phone = this.deleteFor.phone;
          this.deleteFor = null;
          if (this.selected?.phone === phone) {
            this.selected = null;
            this.messages = [];
          }
          this.loadContacts();
        },
        error: () => (this.deleting = false),
      });
  }

  isNewDay(i: number): boolean {
    if (i === 0) return true;
    const d = (t: any) => new Date(t).toDateString();
    return d(this.messages[i].created_at) !== d(this.messages[i - 1].created_at);
  }
}
