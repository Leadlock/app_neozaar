'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DM_Sans, Manrope } from 'next/font/google';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import './nav.css';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-dm-sans', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-manrope', display: 'swap' });

function scrollToId(id, behavior) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior, block: 'start' });
}

// Renders one CoSell360 page (static markup + its scoped stylesheet) between the
// NeoZaar site header and footer. `init` wires the page's own behaviour once.
export default function CoSellFrame({ className, html, init }) {
  const ref = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.ready) return;
    el.dataset.ready = '1';
    if (init) init();
  }, [init]);

  // Arriving from another CoSell360 page via a section link: scroll to that section
  // once layout and fonts have settled. This only fires for an intentional cross-page
  // section click (the cs360Hash flag set in onClick) — NOT for a #hash that merely
  // lingers in the URL on a normal load or when the user presses Back, which would
  // otherwise jump the page away from the top. scroll-margin-top clears the sticky nav.
  useEffect(() => {
    let id = '';
    try {
      id = sessionStorage.getItem('cs360Hash') || '';
      sessionStorage.removeItem('cs360Hash');
    } catch (e) {}
    if (!id) return undefined;
    const go = () => scrollToId(id, 'smooth');
    const t = setTimeout(go, 250);
    return () => clearTimeout(t);
  }, [pathname]);

  // Highlight the Why CoSell360 / How it works link for the section currently in view.
  useEffect(() => {
    const root = ref.current;
    if (!root || !root.querySelector('#why')) return undefined;
    const links = [...root.querySelectorAll('.nav-links a')].filter((a) => /#(why|program)$/.test(a.getAttribute('href') || ''));
    const sections = ['why', 'program'].map((id) => root.querySelector('#' + id)).filter(Boolean);
    if (!links.length || !sections.length) return undefined;
    const setActive = (id) =>
      links.forEach((a) => a.classList.toggle('active', !!id && a.getAttribute('href').endsWith('#' + id)));
    // A section is "current" once its top has passed the upper third of the viewport
    // and its bottom hasn't scrolled out yet.
    const update = () => {
      const line = window.innerHeight * 0.35;
      const current = sections.find((sec) => {
        const r = sec.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      setActive(current ? current.id : '');
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  const onClick = (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || link.target === '_blank') return;
    const href = link.getAttribute('href');
    if (!href) return;

    // Same-page section link (#why, or /isv-registration#why while already on it): smooth-scroll.
    const [path, hash] = href.split('#');
    if (hash && (href.startsWith('#') || path === pathname)) {
      const target = document.getElementById(hash);
      if (target) {
        event.preventDefault();
        scrollToId(hash, 'smooth');
        window.history.replaceState(null, '', '#' + hash);
        // Close the mobile menu after picking a section.
        const menu = ref.current && ref.current.querySelector('.nav-links');
        if (menu) menu.classList.remove('open');
        const toggle = ref.current && ref.current.querySelector('#mobileToggle');
        if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = '☰'; }
        return;
      }
    }

    // Internal links navigate client-side instead of reloading the app.
    if (!href.startsWith('/')) return;
    event.preventDefault();
    if (hash) {
      try { sessionStorage.setItem('cs360Hash', hash); } catch (e) {}
    }
    router.push(path || href);
  };

  return (
    <div className="bg-black">
      {/* Give the site Header its own stacking context above the CoSell360
          sticky sub-nav (z-index: 20 in nav.css) so the profile dropdown, which
          overflows down past the header into the sub-nav band, renders on top
          instead of being covered by it. */}
      <div className="relative z-[100]">
        <Header />
      </div>
      <div
        ref={ref}
        onClick={onClick}
        className={`${className} ${dmSans.variable} ${manrope.variable}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Footer />
    </div>
  );
}
