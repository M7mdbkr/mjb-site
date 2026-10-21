/* MJB line figures: small drawings that answer the pointer (Hairline by Lucas Marques, MIT).
   Each element with data-fig="<name>" gets its figure once it comes near the screen.
   On phones and iPads the figures play on their own until a finger touches them. */
import { relay, exploded, router, phone, query, plug, loupe } from './vendor/hairline-0.5.1-mjb.js';

const FIGURES = { relay, exploded, router, phone, query, plug, loupe };
const touch = matchMedia('(pointer: coarse)').matches;
const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;

function mount(el) {
  const make = FIGURES[el.dataset.fig];
  if (!make || el.dataset.drawn) return;
  el.dataset.drawn = '1';
  try {
    make(el, { theme: 'light', intensity: 0.6, play: touch && !quiet });
  } catch (_) { /* the drawings are decoration; the page works without them */ }
}

const figures = document.querySelectorAll('[data-fig]');
if ('IntersectionObserver' in window) {
  const watch = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) { watch.unobserve(entry.target); mount(entry.target); }
    }
  }, { rootMargin: '300px 0px' });
  figures.forEach(el => watch.observe(el));
} else {
  figures.forEach(mount);
}
