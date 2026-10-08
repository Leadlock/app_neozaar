'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import toast from 'react-hot-toast';
import Header from '../layouts/Header';
import WelcomeScreen from './WelcomeScreen';
import StageTabs from './StageTabs';
import TypingIndicator from './TypingIndicator';
import RecommendationCard from './RecommendationCard';
import HandoffCard from './HandoffCard';
import UnderstandingPanel from './UnderstandingPanel';

// Collision-proof turn id. A plain module-level counter breaks under React
// StrictMode (updaters run twice in dev) and Fast Refresh (module re-runs and
// resets the counter while `turns` state survives) — both produce duplicate
// React keys. Monotonic prefix keeps ordering readable; the random suffix
// guarantees uniqueness.
let turnSeq = 0;
const nextId = () => `t${(++turnSeq).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Stage progress breadcrumb — hidden for now. Flip to true to bring it back.
const SHOW_STAGE_TABS = false;

// Local cookie helper (this codebase has no shared version — every protected
// page defines its own, matching /private-offer's pattern). Values are
// always pre-serialized JSON strings.
const cookieUtils = {
  set: (name, value, days = 1) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
  },
};

const storeRedirectAfterLogin = (url) => {
  const data = JSON.stringify({ url, timestamp: Date.now() });
  cookieUtils.set('redirect_after_login', data, 1);
  try { sessionStorage.setItem('redirect_after_login', data); } catch {}
};

// Best-effort first name from the stored user object, Title-cased.
const firstNameFromStorage = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const raw = String(u.name || u.email || '').trim();
    if (!raw) return '';
    const first = (raw.includes('@') ? raw.split('@')[0] : raw.split(/\s+/)[0]).replace(/[._-]+/g, ' ').trim();
    if (!first) return '';
    return first.charAt(0).toUpperCase() + first.slice(1);
  } catch {
    return '';
  }
};

function MessageBubble({ role, content }) {
  return (
    <div className={`flex flex-col gap-1.5 ${role === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wide px-1 ${role === 'user' ? 'text-orange-400' : 'text-gray-500'}`}>
        {role === 'user' ? 'You' : 'Neo'}
      </div>
      <div
        className={`max-w-[85%] sm:max-w-[72%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line rounded-xl ${
          role === 'user'
            ? 'bg-orange-500/10 border border-orange-500/30 text-white rounded-br-sm'
            : 'bg-white/[0.04] backdrop-blur-md border border-white/[0.08] border-l-2 border-l-orange-500 text-white rounded-tl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ErrorBubble({ content }) {
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <div className="text-[10px] font-bold uppercase tracking-wide px-1 text-gray-500">Neo</div>
      <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[72%] px-4 py-3 text-sm rounded-xl bg-red-500/10 border border-red-500/25 text-red-300">
        <span>⚠</span>
        <span>{content}</span>
      </div>
    </div>
  );
}

function OptionsRow({ options, selected, onSelect, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 max-w-[85%] sm:max-w-[72%]">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt)}
          className={`px-4 py-1.5 text-[13px] rounded-lg border transition-all disabled:cursor-not-allowed ${
            selected === opt.id
              ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-semibold'
              : 'bg-white/[0.04] backdrop-blur-md border-white/[0.09] text-gray-300 hover:border-orange-500/40 hover:text-white hover:bg-orange-500/[0.09] hover:-translate-y-px disabled:opacity-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userName, setUserName] = useState('');

  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const waitGuardRef = useRef(null);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token.trim() === '') {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      storeRedirectAfterLogin(currentUrl);
      router.push('/auth/login');
      return;
    }
    setUserName(firstNameFromStorage());
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  // body's own background is white (globals.css) — this page never scrolls
  // past its own dark content, but rubber-band overscroll on trackpads can
  // still briefly reveal it. Match the page's dark bg while mounted here.
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0A0A0A';
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, []);

  const resetSession = () => {
    setTurns([]);
    setSessionId(null);
    setLatestResponse(null);
    setInput('');
    setLoading(false);
  };

  const selectOption = (turnId, opt) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, selected: opt.id } : t)));
    sendMessage(opt.label);
  };

  // User confirmed a curated bundle on the recommendation card — remember the
  // picks on that turn (so the card can re-render read-only) and push them to
  // the backend along with a natural "proceed" message.
  const confirmBundle = (turnId, selection) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, bundle: selection } : t)));
    sendMessage(
      "Proceed with this recommendation — these are the products and services I want.",
      { selectedBundle: selection },
    );
  };

  const sendMessage = async (overrideText, opts = {}) => {
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    // Build the turn object outside the updater — StrictMode invokes updaters
    // twice in dev, which would otherwise mint two different ids per append.
    const userTurn = { id: nextId(), type: 'user', content: text };
    setTurns((prev) => [...prev, userTurn]);

    waitGuardRef.current = setTimeout(() => setLoading(false), 60000);

    try {
      const body = { message: text };
      if (sessionId) body.session_id = sessionId;
      if (opts.selectedBundle) body.selected_bundle = opts.selectedBundle;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}ai/discovery/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try {
          const e = await res.json();
          errMsg = e.message || e.error || errMsg;
        } catch {}
        const errTurn = { id: nextId(), type: 'error', content: errMsg };
        setTurns((prev) => [...prev, errTurn]);
        return;
      }

      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
      setLatestResponse(data);

      const newTurns = [];
      if (data.state === 'question' || data.state === 'qualification') {
        if (data.message) newTurns.push({ id: nextId(), type: 'neo', content: data.message });
        if (data.options?.length > 0) newTurns.push({ id: nextId(), type: 'options', options: data.options });
      } else if (data.state === 'recommendation') {
        newTurns.push({ id: nextId(), type: 'recommendation', data });
        if (data.options?.length > 0) newTurns.push({ id: nextId(), type: 'options', options: data.options });
      } else if (data.state === 'handoff') {
        if (data.message) newTurns.push({ id: nextId(), type: 'neo', content: data.message });
        if (data.sales_handoff) newTurns.push({ id: nextId(), type: 'handoff', handoff: data.sales_handoff });
        toast.success('Your request is ready for the NeoZaar team.');
      } else if (data.message) {
        newTurns.push({ id: nextId(), type: 'neo', content: data.message });
      }
      setTurns((prev) => [...prev, ...newTurns]);
    } catch (err) {
      console.error(err);
      const msg = err?.message?.includes('fetch') ? 'Cannot reach the API. Please try again shortly.' : 'Network error. Please try again.';
      const errTurn = { id: nextId(), type: 'error', content: msg };
      setTurns((prev) => [...prev, errTurn]);
      toast.error(msg);
    } finally {
      clearTimeout(waitGuardRef.current);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderTurn = (t) => {
    if (t.type === 'user') return <MessageBubble role="user" content={t.content} />;
    if (t.type === 'neo') return <MessageBubble role="neo" content={t.content} />;
    if (t.type === 'error') return <ErrorBubble content={t.content} />;
    if (t.type === 'options')
      return (
        <OptionsRow
          options={t.options}
          selected={t.selected}
          disabled={!!t.selected || loading}
          onSelect={(opt) => selectOption(t.id, opt)}
        />
      );
    if (t.type === 'recommendation') {
      const idx = turns.findIndex((x) => x.id === t.id);
      // Lock once the conversation has moved past this card — a later user / Neo
      // / handoff / newer recommendation turn. The sibling "options" row that
      // trails this same response does NOT count as moving on.
      const movedOn = turns
        .slice(idx + 1)
        .some((x) => ['user', 'neo', 'handoff', 'recommendation'].includes(x.type));
      return (
        <RecommendationCard
          data={t.data}
          bundle={t.bundle}
          locked={loading || movedOn}
          onConfirm={(sel) => confirmBundle(t.id, sel)}
          onEdit={() => setTurns((prev) => prev.map((x) => (x.id === t.id ? { ...x, bundle: null } : x)))}
        />
      );
    }
    if (t.type === 'handoff') return <HandoffCard handoff={t.handoff} onProceed={createOpportunity} onNewChat={resetSession} />;
    return null;
  };

  const showWelcome = turns.length === 0;

  // Latest customer-confirmed bundle (from a recommendation turn), if any — used
  // to mirror the curated picks in the Understanding panel.
  const confirmedBundle = [...turns].reverse().find((t) => t.type === 'recommendation' && t.bundle)?.bundle || null;

  // Create a single CRM opportunity from the finished session. Identity comes
  // from the signed-in user (localStorage.user); the token authorises the call.
  const createOpportunity = async () => {
    const token = localStorage.getItem('token');
    let u = {};
    try { u = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}ai/discovery/opportunity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: sessionId,
        name: u.name || '',
        email: u.email || '',
        company: u.company || u.organization || u.company_name || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
    return data; // { opportunity_id, opportunity_name, already_existed }
  };

  // One easing + a chained delay ladder so the shell assembles in sequence:
  // stage tabs → conversation → composer → understanding panel.
  const EASE = [0.22, 1, 0.36, 1];
  const STEP = { tabs: 0.04, convo: 0.12, input: 0.22, panel: 0.3 };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] m-auto bg-[#0A0A0A]">
      <Header />

      {/* Header band = the component's own h-20 (80px) + its py-3 shell (24px)
          = 104px; the vendor ticker is a global position:fixed bar at the
          bottom of every page (64px, 52px on mobile — matches Tailwind's md:
          768px breakpoint). This section is hard-capped to exactly the space
          between them, with its own internal scroll, so it never pushes the
          ticker off-screen and never grows the page itself as the conversation
          gets longer. No <Footer/> here on purpose — the ticker already
          renders regardless. */}
      <MotionConfig reducedMotion="user">
      <div className="h-[calc(100vh-156px)] md:h-[calc(100vh-168px)] flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {showWelcome ? (
            <motion.div
              key="welcome"
              className="flex-1 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.985 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <WelcomeScreen userName={userName} loading={loading} onSend={(t) => sendMessage(t)} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              className="flex-1 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {SHOW_STAGE_TABS && (
                <motion.div
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: STEP.tabs }}
                >
                  <StageTabs state={latestResponse?.state} />
                </motion.div>
              )}

              <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
                {/* Conversation panel */}
                <motion.div
                  className="flex flex-col flex-1 min-w-0 lg:border-r border-white/[0.07]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, ease: EASE, delay: STEP.convo }}
                >
                  <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                    <div className="flex flex-col gap-4 px-4 sm:px-9 py-6">
                      <AnimatePresence initial={false}>
                        {turns.map((t) => (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, ease: EASE }}
                          >
                            {renderTurn(t)}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <AnimatePresence>
                        {loading && (
                          <motion.div
                            key="typing"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: EASE }}
                          >
                            <TypingIndicator />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div ref={scrollRef} />
                    </div>
                  </div>

                  {/* Input row */}
                  <motion.div
                    className="px-4 sm:px-6 py-4 border-t border-white/[0.07] bg-black/30 backdrop-blur-md"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, ease: EASE, delay: STEP.input }}
                  >
                    <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-white/[0.04] backdrop-blur-md border border-white/[0.10] rounded-xl px-4 py-2.5 focus-within:border-orange-500/50">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        rows={1}
                        maxLength={2000}
                        placeholder="Tell Neo about your business requirement, project, challenge, or technology need…"
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none outline-none py-1 max-h-[140px]"
                      />
                      <button
                        type="button"
                        onClick={resetSession}
                        title="Start a new chat"
                        className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-white/[0.12] text-[11px] font-semibold text-gray-300 hover:text-orange-400 hover:border-orange-500/40 hover:bg-orange-500/[0.07] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                        New chat
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        aria-label="Send"
                        className="shrink-0 w-7 h-7 rounded-md bg-gradient-to-r from-orange-500 to-orange-700 flex items-center justify-center hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 2 11 13" />
                          <path d="M22 2 15 22 11 13 2 9l20-7z" />
                        </svg>
                      </button>
                    </form>
                  </motion.div>
                </motion.div>

                {/* Understanding panel — gradient "border" via a padded gradient
                    wrapper behind a solid rounded inner panel. */}
                <motion.aside
                  className="hidden lg:block w-[320px] shrink-0 p-3"
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.34, ease: EASE, delay: STEP.panel }}
                >
                  <div className="h-full rounded-2xl p-[1.5px] bg-gradient-to-b from-orange-500/55 via-orange-500/15 to-transparent">
                    <div className="h-full rounded-2xl bg-[#0A0A0A] flex flex-col overflow-hidden">
                      <div className="px-4 pt-4 pb-2.5 shrink-0">
                        <div className="text-sm font-semibold text-white">Requirement Understanding</div>
                      </div>
                      <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <UnderstandingPanel data={latestResponse} bundle={confirmedBundle} />
                      </div>
                    </div>
                  </div>
                </motion.aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </MotionConfig>
    </div>
  );
}
