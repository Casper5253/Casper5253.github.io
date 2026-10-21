import { href } from '../components/site/url';
import { initializeStacks } from './stacks';

const opening = document.querySelector<HTMLElement>('#opening');
const chapters = [...document.querySelectorAll<HTMLElement>('.chapter[data-chapter]')];
const sections = [opening, ...chapters].filter((section): section is HTMLElement => section !== null);
const chapterLinks = [...document.querySelectorAll<HTMLAnchorElement>('.chapter-nav a')];
const activeTitle = document.querySelector<HTMLElement>('.active-title');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const chapterTitles = new Map(chapters.map((chapter) => [chapter.id, chapter.querySelector('h2')?.textContent ?? '']));
let fieldController: { setChapter(id: string): void; measure(): void } | undefined;
let activeId = 'opening';
let updateFrame = 0;

function validSection(id: string) {
  return sections.find((section) => section.id === id);
}

function activate(id: string) {
  const section = validSection(id);
  if (!section) return;
  activeId = id;
  document.documentElement.dataset.chapter = id;
  const title = chapterTitles.get(id) ?? '';
  chapterLinks.forEach((link) => {
    if (title && link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (activeTitle) {
    activeTitle.textContent = title;
    if (title) activeTitle.dataset.tone = id;
    else activeTitle.removeAttribute('data-tone');
  }
  fieldController?.setChapter(id);
}

function updateFromScroll() {
  updateFrame = 0;
  const readingPoint = window.innerHeight * .4;
  let nextId = 'opening';
  chapters.forEach((chapter) => {
    if (chapter.getBoundingClientRect().top <= readingPoint) nextId = chapter.id;
  });
  if (nextId !== activeId) activate(nextId);
}

function scheduleUpdate() {
  if (!updateFrame) updateFrame = requestAnimationFrame(updateFromScroll);
}

function focusTarget(section: HTMLElement) {
  const heading = section.querySelector<HTMLElement>('h1, h2');
  heading?.focus({ preventScroll: true });
}

window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', () => {
  fieldController?.measure();
  scheduleUpdate();
}, { passive: true });

window.addEventListener('hashchange', () => {
  const target = validSection(window.location.hash.slice(1));
  if (target) activate(target.id);
});

document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (!(event.target instanceof HTMLElement)) return;
  if (event.target.closest('input, textarea, select, button, dialog, .text-nav, .stack-index, [contenteditable="true"]')) return;

  const currentIndex = sections.findIndex((section) => section.id === activeId);
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const next = sections[Math.max(0, Math.min(sections.length - 1, currentIndex + step))];
  if (!next) return;

  event.preventDefault();
  history.replaceState(null, '', href(`/#${next.id}`));
  next.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  focusTarget(next);
});

initializeStacks();
activate(validSection(window.location.hash.slice(1))?.id ?? 'opening');
scheduleUpdate();

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(async () => {
    const { startField } = await import('./field');
    const field = startField();
    fieldController = field;
    field.setChapter(activeId);
    field.measure();

    document.fonts.ready.then(() => field.measure());
    [...document.images].forEach((image) => {
      if (image.complete) {
        field.measure();
        return;
      }
      image.addEventListener('load', () => field.measure(), { once: true });
      image.addEventListener('error', () => field.measure(), { once: true });
    });
  });
});
