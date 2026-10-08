import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface GuideStep { title:string; route:string; purpose:string; actions:string[]; ready:string; warning?:string; }

@Component({
  selector:'app-marketing-help', standalone:true, imports:[CommonModule,RouterModule],
  template:`
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <header class="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
      <div class="text-xs uppercase tracking-widest font-semibold">First-time guide</div>
      <h1 class="text-3xl font-bold mt-1">Welcome to NeoZaar Marketing</h1>
      <p class="mt-2 max-w-3xl text-orange-50">This workspace is for internal marketing staff. It helps you collect contacts, understand interest, build audiences, communicate with consent, automate follow-up and pass qualified leads to CRM.</p>
      <a routerLink="/marketing/dashboard" class="inline-block mt-4 bg-white text-orange-700 rounded-lg px-4 py-2 font-semibold">Open Marketing Dashboard</a>
    </header>

    <section class="card">
      <h2 class="title">The complete process</h2>
      <div class="grid md:grid-cols-6 gap-2 mt-4 text-center text-xs">
        <div *ngFor="let x of flow;let last=last" class="relative rounded-lg bg-orange-50 text-orange-800 px-3 py-3 font-semibold">{{x}}<span *ngIf="!last" class="hidden md:block absolute -right-2 top-3 text-orange-400">→</span></div>
      </div>
      <p class="hint mt-3">A marketing contact is not a NeoZaar login user. It is a person or company contact being tracked, segmented, nurtured and qualified.</p>
    </section>

    <section class="grid md:grid-cols-3 gap-4">
      <div class="card"><div class="eyebrow">Before sending</div><b>Consent comes first</b><p class="hint">Check email, SMS or WhatsApp consent and do-not-contact status. NeoZaar also performs a final suppression check during delivery.</p></div>
      <div class="card"><div class="eyebrow">Before activating</div><b>Preview the audience</b><p class="hint">Preview segments and keep new automations, journeys, experiments and pages in draft until another marketer reviews them.</p></div>
      <div class="card"><div class="eyebrow">After launching</div><b>Watch results and health</b><p class="hint">Use Analytics, execution logs and worker health. A configured item is not proof that a provider delivered it.</p></div>
    </section>

    <section class="card"><h2 class="title">Recommended first-day setup</h2><ol class="mt-3 space-y-2 text-sm"><li *ngFor="let item of setup;let i=index" class="flex gap-3"><span class="step">{{i+1}}</span><span>{{item}}</span></li></ol></section>

    <section><h2 class="title mb-3">Screen-by-screen walkthrough</h2><div class="space-y-4"><article *ngFor="let s of steps;let i=index" class="card"><div class="flex flex-wrap justify-between gap-3"><div><div class="eyebrow">Step {{i+1}}</div><h3 class="text-lg font-bold">{{s.title}}</h3><p class="hint">{{s.purpose}}</p></div><a [routerLink]="s.route" class="link">Open screen →</a></div><div class="grid md:grid-cols-2 gap-4 mt-4"><div><b class="text-sm">What to do</b><ul class="list-disc pl-5 mt-2 text-sm text-slate-600 space-y-1"><li *ngFor="let a of s.actions">{{a}}</li></ul></div><div><b class="text-sm">You are ready when</b><p class="mt-2 text-sm text-slate-600">{{s.ready}}</p><p *ngIf="s.warning" class="mt-3 rounded bg-amber-50 text-amber-800 p-2 text-xs"><b>Important:</b> {{s.warning}}</p></div></div></article></div></section>

    <section class="card"><h2 class="title">Safe launch checklist</h2><div class="grid md:grid-cols-2 gap-2 mt-3"><label *ngFor="let c of checklist" class="flex gap-2 text-sm p-2 rounded hover:bg-slate-50"><input type="checkbox" class="accent-orange-500"><span>{{c}}</span></label></div></section>

    <section class="card"><h2 class="title">Simple glossary</h2><div class="grid md:grid-cols-2 gap-3 mt-3"><div *ngFor="let g of glossary" class="border-t pt-2"><b class="text-sm">{{g[0]}}</b><p class="hint">{{g[1]}}</p></div></div></section>
  </div>`,
  styles:[`.card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1.25rem}.title{font-size:1.1rem;font-weight:700;color:#0f172a}.hint{font-size:.82rem;color:#64748b;margin-top:.25rem}.eyebrow{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#f97316;font-weight:700}.step{display:inline-flex;flex:0 0 1.5rem;height:1.5rem;align-items:center;justify-content:center;border-radius:999px;background:#fff7ed;color:#c2410c;font-weight:700}.link{color:#ea580c;font-size:.85rem;font-weight:600}`]
})
export class MarketingHelpComponent {
  flow=['Capture','Understand','Segment','Create','Automate','Measure'];
  setup=['Confirm sender profiles, subscription types, channel policies and provider configuration.','Review existing contacts, consent, custom fields, tags and lifecycle stages.','Create or preview a small internal test segment.','Prepare an email, page or approved channel template and keep it in draft.','Build the automation or journey, then test with internal contacts.','Launch gradually and monitor Analytics, execution logs and worker health.'];
  steps:GuideStep[]=[
    {title:'Dashboard',route:'/marketing/dashboard',purpose:'Your daily overview of contacts, qualification, sources, campaigns and recent activity.',actions:['Check total, new and active contacts.','Review the lifecycle funnel and MQL count.','Look for unusual recent activity or source changes.'],ready:'The numbers are understood and any unexpected spike or drop has been investigated.'},
    {title:'Contacts',route:'/marketing/contacts',purpose:'The marketing database and each contact’s complete activity history.',actions:['Search and filter contacts.','Open Profile & timeline before contacting someone.','Review consent and do-not-contact status.','Add internal notes, lifecycle stage and custom-field information.','Use import/export carefully for controlled data work.'],ready:'Contacts are identifiable, correctly staged and have valid communication permission.',warning:'Import updates matching email addresses. Review spreadsheet headings and test with a small file first.'},
    {title:'Tags, custom fields and scoring',route:'/marketing/tags',purpose:'Organize contacts and translate engagement into marketing intent.',actions:['Use tags for clear reusable labels.','Define scoring rules for meaningful behavior.','Avoid awarding points for low-value repeated activity.','Use negative scores for opt-outs or inactivity where appropriate.'],ready:'Every tag and scoring rule has a clear business meaning and no duplicate rule exists.'},
    {title:'Segments',route:'/marketing/segments',purpose:'Build a reusable audience from contact, tag, score and activity conditions.',actions:['Choose whether all or any rules must match.','Preview the audience before saving.','Refresh dynamic membership before a major send.','Name the segment so another marketer understands it.'],ready:'The preview contains the expected people and excludes suppressed or irrelevant contacts.'},
    {title:'Emails',route:'/marketing/emails',purpose:'Design reusable emails, configure senders and queue consent-aware delivery.',actions:['Create the email visually and add a plain-text version.','Use only supported personalization fields.','Select a sender profile and subscription type.','Send to a test contact before selecting the full segment.'],ready:'Links, mobile layout, sender identity, subject, unsubscribe path and test delivery are correct.',warning:'Queued or pushed does not automatically mean delivered; verify delivery events and provider status.'},
    {title:'Forms',route:'/marketing/forms',purpose:'Capture contact information and consent through public forms.',actions:['Ask only for information marketing really needs.','Use explicit consent fields and a clear purpose statement.','Publish and submit a test response.','Confirm the resulting contact, event and timeline entry.'],ready:'A test submission creates or updates the right contact and records consent correctly.'},
    {title:'Pages & Assets',route:'/marketing/content',purpose:'Publish campaign landing pages and tracked downloadable resources.',actions:['Build page sections in a logical reading order.','Add an SEO description and meaningful slug.','Use tracked asset blocks for downloads.','Preview while draft, then publish when approved.'],ready:'The public page opens, its links work, and views/downloads are recorded.',warning:'Assets currently use managed URLs; confirm that the destination remains publicly available.'},
    {title:'Automations',route:'/marketing/automations',purpose:'React to behavior with conditions, waits and actions.',actions:['Start with a precise trigger.','Add consent or suppression checks before communication actions.','Use waits to avoid overwhelming contacts.','End every branch clearly and activate only after validation.'],ready:'The visual path has no dead ends and an internal test produces the expected execution log.'},
    {title:'Journeys & A/B experiments',route:'/marketing/journeys',purpose:'Coordinate larger nurture stages and compare controlled variants.',actions:['Attach a tested automation to each journey.','Define readable stages and measurable goals.','For experiments, keep traffic at exactly 100%.','Choose one conversion event before activation.'],ready:'The journey goal is measurable and experiment variants differ in only the intended variable.',warning:'Experiment variants lock after assignment so results cannot be silently rewritten.'},
    {title:'WhatsApp & SMS',route:'/marketing/channels',purpose:'Manage approved provider templates, quiet hours, frequency caps and audit records.',actions:['Create the matching provider template ID.','Keep unapproved templates in draft or pending.','Set the correct timezone and quiet hours.','Review blocked, skipped, failed and sent audit records.'],ready:'The template is provider-approved, policies are saved and a consented test contact succeeds.',warning:'Without a configured provider adapter, NeoZaar safely records the action as skipped.'},
    {title:'Campaigns',route:'/campaigns',purpose:'Connect the audience, content, automation, schedule and conversion goal.',actions:['Select the reviewed segment and published template.','Attach the correct automation if required.','Set schedule and conversion goal.','Review the complete campaign before saving or pushing.'],ready:'Audience, message, schedule, owner and success goal all agree.'},
    {title:'Analytics, logs and health',route:'/marketing/analytics',purpose:'Measure factual outcomes and confirm background work is operating.',actions:['Compare engagement and conversion, not opens alone.','Review attribution by source, medium and campaign.','Investigate failed or waiting executions.','Confirm every marketing worker is healthy.','Use retention cleanup only with an approved policy.'],ready:'Workers are healthy, failures are understood, and reported conversions match real business outcomes.',warning:'Retention cleanup deletes old marketing history. Confirm the policy before queuing it.'}
  ];
  checklist=['Audience preview reviewed','Consent and suppression checked','Sender/provider configured','Test contact completed the flow','Links and public pages verified','Automation branches and waits reviewed','Schedule and timezone confirmed','Conversion goal selected','Worker health is green','A rollback or pause owner is known'];
  glossary=[['Contact','A person being marketed to; not necessarily a NeoZaar user.'],['Segment','A saved audience created from rules.'],['MQL','A marketing-qualified lead ready for closer review or CRM handoff.'],['Journey','A larger nurture path built around stages and goals.'],['Automation','A trigger, conditions and actions executed in the background.'],['Suppression','A rule preventing communication, such as no consent or do-not-contact.'],['Attribution','Credit connecting a conversion to earlier marketing touchpoints.'],['Experiment','A controlled comparison of content variants using one conversion goal.']];
}
