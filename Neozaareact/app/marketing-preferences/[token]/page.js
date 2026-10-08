"use client";

import { use, useEffect, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_ANALYTICS_URL || "/api").replace(/\/+$/, "");

const CHANNELS = [
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "sms", label: "SMS" },
];

/**
 * Public, token-gated preference center — reached from the "Manage
 * preferences" link in marketing emails. No login: possessing the token
 * (only ever sent to that contact's own inbox) is the proof of identity,
 * same convention the unsubscribe link already uses.
 */
export default function MarketingPreferencesPage({ params }) {
  const { token } = use(params);
  const [state, setState] = useState({ loading: true, error: null, data: null, saving: false, saved: false });

  useEffect(() => {
    fetch(`${API_BASE}/marketing/preferences/${token}`)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.message || "Unable to load your preferences");
        setState({ loading: false, error: null, data: body.data, saving: false, saved: false });
      })
      .catch((error) => setState((s) => ({ ...s, loading: false, error: error.message })));
  }, [token]);

  function toggleConsent(channel) {
    setState((s) => ({ ...s, data: { ...s.data, consent: { ...s.data.consent, [channel]: !s.data.consent[channel] } }, saved: false }));
  }

  function toggleSubscription(code) {
    setState((s) => {
      const subscriptions = s.data.subscriptions.map((sub) => (sub.code === code ? { ...sub, subscribed: !sub.subscribed } : sub));
      return { ...s, data: { ...s.data, subscriptions }, saved: false };
    });
  }

  function toggleDoNotContact() {
    setState((s) => ({ ...s, data: { ...s.data, doNotContact: !s.data.doNotContact }, saved: false }));
  }

  async function save() {
    setState((s) => ({ ...s, saving: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}/marketing/preferences/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailConsent: state.data.consent.email,
          whatsappConsent: state.data.consent.whatsapp,
          smsConsent: state.data.consent.sms,
          doNotContact: state.data.doNotContact,
          subscriptions: state.data.subscriptions.filter((s) => s.subscribed).map((s) => s.code),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "Unable to save your preferences");
      setState({ loading: false, error: null, data: body.data, saving: false, saved: true });
    } catch (error) {
      setState((s) => ({ ...s, saving: false, error: error.message }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Email &amp; message preferences</h1>
        {state.loading && <p className="text-slate-500 text-sm mt-4">Loading…</p>}
        {state.error && <p className="text-red-600 text-sm mt-4">{state.error}</p>}

        {state.data && (
          <>
            <p className="text-sm text-slate-500 mb-5">{state.data.email || state.data.phone}</p>

            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Channels</h2>
              {CHANNELS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                  <input type="checkbox" checked={Boolean(state.data.consent[c.key])} onChange={() => toggleConsent(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>

            {state.data.subscriptions?.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Topics</h2>
                {state.data.subscriptions.map((sub) => (
                  <label key={sub.code} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                    <input type="checkbox" checked={sub.subscribed} onChange={() => toggleSubscription(sub.code)} />
                    {sub.name}
                  </label>
                ))}
              </div>
            )}

            <div className="mb-5 border-t pt-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(state.data.doNotContact)} onChange={toggleDoNotContact} />
                Don&apos;t contact me on any channel
              </label>
            </div>

            <button
              onClick={save}
              disabled={state.saving}
              className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {state.saving ? "Saving…" : "Save preferences"}
            </button>
            {state.saved && <p className="text-green-600 text-sm mt-3 text-center">Preferences saved.</p>}
          </>
        )}
      </div>
    </div>
  );
}
