'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

const SCENARIOS = [
  { q: 'I want to secure my environment', label: 'Secure my environment' },
  { q: 'I want to protect my data', label: 'Protect my data' },
  { q: 'I want to move to cloud', label: 'Move to cloud' },
  { q: 'I want to modernise my applications', label: 'Modernise applications' },
  { q: 'I want to adopt AI', label: 'Adopt AI' },
  { q: 'I need to meet compliance requirements', label: 'Meet compliance' },
  { q: 'I want to improve our workplace technology', label: 'Improve workplace' },
  { q: 'I want to reduce cloud cost', label: 'Reduce cloud cost' },
  { q: 'I want to manage IT continuously', label: 'Manage IT' },
  { q: "I'm not sure what I need", label: 'Help me decide' },
];

// Centred "composer" welcome state — heading + single rounded input +
// scenario shortcuts underneath. Owns its own draft text; the moment a
// message is sent the parent switches to the full chat layout and its own
// bottom input takes over.
export default function WelcomeScreen({ userName, loading, onSend }) {
  const [text, setText] = useState('');
  const taRef = useRef(null);

  const submit = (value) => {
    const v = (typeof value === 'string' ? value : text).trim();
    if (!v || loading) return;
    onSend(v);
    setText('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const handleChange = (e) => {
    setText(e.target.value);
    const el = taRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const greeting = userName ? `, ${userName}` : '';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide relative flex flex-col">
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-[95vw] h-[560px] rounded-full bg-orange-600/10 blur-[160px]" />

      <motion.div
        className="relative w-full max-w-3xl mx-auto my-auto px-4 sm:px-6 py-10 flex flex-col items-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.h1
          variants={item}
          className="text-2xl sm:text-3xl lg:text-[40px] font-normal tracking-tight text-white/90 text-center mb-8 sm:mb-10"
        >
          What are you trying to achieve{greeting}?
        </motion.h1>

        {/* Composer */}
        <motion.form
          variants={item}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="w-full flex items-end gap-2 bg-white/[0.06] border border-white/[0.09] rounded-[26px] px-5 py-3.5 transition-colors focus-within:border-orange-500/40 shadow-[0_1px_24px_rgba(0,0,0,0.35)]"
        >
          <textarea
            ref={taRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            maxLength={2000}
            placeholder="Tell Neo what you're trying to achieve…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-[15px] leading-6 resize-none outline-none py-1 max-h-[200px] scrollbar-hide"
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            aria-label="Send"
            className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-orange-700 flex items-center justify-center hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22 11 13 2 9l20-7z" />
            </svg>
          </button>
        </motion.form>

        {/* Scenario shortcuts */}
        <motion.div variants={item} className="w-full mt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[10.5px] font-bold uppercase tracking-widest text-gray-500">Start with a scenario</span>
            <span className="flex-1 h-px bg-white/[0.07]" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={loading}
                onClick={() => submit(s.q)}
                className="px-3.5 py-2 bg-white/[0.04] border border-white/[0.08] rounded-full text-[12.5px] text-gray-300 hover:border-orange-500/40 hover:text-white hover:bg-orange-500/[0.07] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
