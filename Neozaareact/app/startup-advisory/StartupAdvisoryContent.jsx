'use client';

import { useEffect, useRef } from 'react';

export default function StartupAdvisoryContent({ markup, styles }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host { display: block; background: #050505; color: #f7f7f7; font: 16px/1.55 "DM Sans", Arial, sans-serif; }
      ${styles}
    </style><div class="advisory-root">${markup}</div>`;

    const revealItems = [...shadow.querySelectorAll('.reveal')];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      }),
      { threshold: 0.12 }
    );
    revealItems.forEach((element) => observer.observe(element));

    const handleAnchorClick = (event) => {
      const anchor = event.currentTarget;
      const targetId = anchor.getAttribute('href')?.slice(1);
      const target = targetId ? shadow.getElementById(targetId) : null;
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const anchorLinks = [...shadow.querySelectorAll('a[href^="#"]')];
    anchorLinks.forEach((link) => link.addEventListener('click', handleAnchorClick));

    const sessionLinks = [...shadow.querySelectorAll('[data-session]')];
    const updateSessionTitle = (event) => {
      const title = shadow.getElementById('cta-title');
      if (title) title.textContent = `Bring your ${event.currentTarget.dataset.session} challenge to office hours.`;
    };
    sessionLinks.forEach((link) => link.addEventListener('click', updateSessionTitle));

    const mobileCta = shadow.querySelector('.mobile-cta');
    const updateMobileCta = () => {
      if (!mobileCta) return;
      const bounds = host.getBoundingClientRect();
      const withinPage = bounds.top < -560 && bounds.bottom > 850;
      mobileCta.classList.toggle('show', withinPage);
    };
    window.addEventListener('scroll', updateMobileCta, { passive: true });
    updateMobileCta();

    return () => {
      observer.disconnect();
      anchorLinks.forEach((link) => link.removeEventListener('click', handleAnchorClick));
      sessionLinks.forEach((link) => link.removeEventListener('click', updateSessionTitle));
      window.removeEventListener('scroll', updateMobileCta);
    };
  }, [markup, styles]);

  return <div ref={hostRef} />;
}
