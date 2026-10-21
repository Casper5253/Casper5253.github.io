const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function addLink(container: HTMLElement, label: string, path: string | undefined) {
  if (!path) return;
  const link = document.createElement('a');
  link.href = path;
  link.textContent = label;
  container.append(link);
}

function setupStack(group: HTMLElement) {
  const stack = group.querySelector<HTMLElement>('[data-stack]');
  const cards = [...group.querySelectorAll<HTMLButtonElement>('[data-stack-card]')];
  const indexButtons = [...group.querySelectorAll<HTMLButtonElement>('[data-stack-index]')];
  const caption = group.querySelector<HTMLElement>('[data-stack-caption]');
  const captionTitle = group.querySelector<HTMLElement>('[data-caption-title]');
  const captionCopy = group.querySelector<HTMLElement>('[data-caption-copy]');
  const captionLinks = group.querySelector<HTMLElement>('[data-caption-links]');
  const dialog = group.querySelector<HTMLDialogElement>('dialog');
  const dialogImage = group.querySelector<HTMLImageElement>('[data-dialog-image]');
  const dialogTitle = group.querySelector<HTMLElement>('[data-dialog-title]');
  const dialogCaption = group.querySelector<HTMLElement>('[data-dialog-caption]');
  const dialogLinks = group.querySelector<HTMLElement>('[data-dialog-links]');
  const closeButton = group.querySelector<HTMLButtonElement>('[data-dialog-close]');

  if (!stack || !cards.length || !indexButtons.length || !caption || !captionTitle || !captionCopy || !captionLinks || !dialog || !dialogImage || !dialogTitle || !dialogCaption || !dialogLinks || !closeButton) return;

  const stackElement = stack;
  const captionElement = caption;
  const captionTitleElement = captionTitle;
  const captionCopyElement = captionCopy;
  const captionLinksElement = captionLinks;
  const dialogElement = dialog;
  const dialogImageElement = dialogImage;
  const dialogTitleElement = dialogTitle;
  const dialogCaptionElement = dialogCaption;
  const dialogLinksElement = dialogLinks;
  const closeButtonElement = closeButton;

  let current = 0;

  // Each card's button covers exactly the part of its print that is visible, so a click lands on what you see:
  // the current print is on top, then earlier cards above later ones (matching the CSS z-index).
  const layoutHitAreas = () => {
    const step = parseFloat(getComputedStyle(cards[0]!).getPropertyValue('--fan-step')) || 52;
    const heights = cards.map((card) => card.querySelector<HTMLElement>('.artifact-print')?.offsetHeight ?? step);
    const order = cards.map((_, index) => index).sort((a, b) => Number(b === current) - Number(a === current) || a - b);
    const covered: [number, number][] = [];
    for (const index of order) {
      const top = index * step;
      const bottom = top + heights[index]!;
      let free: [number, number][] = [[top, bottom]];
      for (const [from, to] of covered) {
        free = free.flatMap(([start, end]): [number, number][] => (to <= start || from >= end
          ? [[start, end]]
          : ([[start, Math.min(from, end)], [Math.max(to, start), end]] as [number, number][]).filter(([s, e]) => e - s > 0.5)));
      }
      const [start, end] = free.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? [top, top];
      const card = cards[index]!;
      card.style.setProperty('--hit-top', `${start}px`);
      card.style.setProperty('--hit-height', `${end - start}px`);
      card.style.setProperty('--hit-offset', `${start - top}px`);
      covered.push([top, bottom]);
    }
  };

  const measureStack = () => {
    const cardHeight = Math.max(...cards.map((card) => card.querySelector<HTMLElement>('.artifact-print')?.getBoundingClientRect().height ?? 0));
    stackElement.style.setProperty('--stack-height', `${cardHeight + (cards.length - 1) * 52}px`);
    layoutHitAreas();
  };
  const stackResizeObserver = new ResizeObserver(measureStack);
  stackResizeObserver.observe(stackElement);
  group.querySelectorAll('img').forEach((image) => {
    if (image.complete) measureStack();
    else {
      image.addEventListener('load', measureStack, { once: true });
      image.addEventListener('error', measureStack, { once: true });
    }
  });
  measureStack();

  let captionTimer = 0;
  let pointerFrame = 0;
  let visible = false;
  let pointer = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  let returnFocus: HTMLButtonElement | null = null;

  cards[0]?.setAttribute('aria-label', `Open ${cards[0].dataset.title ?? 'image'} enlarged`);

  function updateLinks(container: HTMLElement, card: HTMLButtonElement) {
    container.replaceChildren();
    addLink(container, 'Case study', card.dataset.caseHref);
    addLink(container, 'Read the article', card.dataset.articleHref);
  }

  function updateDialogLinks(card: HTMLButtonElement) {
    updateLinks(dialogLinksElement, card);
    addLink(dialogLinksElement, 'Open original image', card.dataset.fullSrc);
  }

  function updateCaption(card: HTMLButtonElement) {
    captionTitleElement.textContent = card.dataset.title ?? '';
    captionCopyElement.textContent = card.dataset.caption ?? '';
    updateLinks(captionLinksElement, card);
  }

  function select(index: number) {
    const card = cards[index];
    if (!card) return;
    current = index;

    cards.forEach((item, itemIndex) => {
      const selected = itemIndex === index;
      item.classList.toggle('is-current', selected);
      item.setAttribute('aria-label', `${selected ? 'Open' : 'Select'} ${item.dataset.title ?? 'image'}${selected ? ' enlarged' : ''}`);
    });
    layoutHitAreas();

    indexButtons.forEach((button, itemIndex) => {
      const selected = itemIndex === index;
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.index-label')?.remove();
      if (selected) {
        const label = document.createElement('span');
        label.className = 'index-label';
        label.textContent = cards[itemIndex]?.dataset.label ?? '';
        button.append(label);
      }
    });

    captionElement.classList.add('is-changing');
    window.clearTimeout(captionTimer);
    captionTimer = window.setTimeout(() => {
      if (current !== index) return;
      updateCaption(card);
      captionElement.classList.remove('is-changing');
    }, 60);
  }

  function openCurrent() {
    const card = cards[current];
    if (!card || dialogElement.open) return;
    returnFocus = card;
    dialogTitleElement.textContent = card.dataset.title ?? '';
    dialogCaptionElement.textContent = card.dataset.caption ?? '';
    dialogImageElement.alt = card.dataset.alt ?? '';
    dialogImageElement.src = card.dataset.fullSrc ?? '';
    dialogImageElement.classList.toggle('is-dark', card.dataset.dark === 'true');
    updateDialogLinks(card);
    dialogElement.showModal();
  }

  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      if (index === current) openCurrent();
      else select(index);
    });
  });

  indexButtons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
  });

  group.querySelector('.stack-index')?.addEventListener('keydown', (event) => {
    if (!(event instanceof KeyboardEvent) || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const focusedIndex = indexButtons.indexOf(document.activeElement as HTMLButtonElement);
    if (focusedIndex < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (focusedIndex + direction + indexButtons.length) % indexButtons.length;
    indexButtons[nextIndex]?.focus();
    select(nextIndex);
  });

  closeButtonElement.addEventListener('click', () => dialogElement.close());
  dialogElement.addEventListener('close', () => {
    dialogImageElement.removeAttribute('src');
    returnFocus?.focus();
    returnFocus = null;
  });

  const moveParallax = () => {
    pointerFrame = 0;
    if (!visible || document.hidden || reducedMotion.matches) return;
    pointer.x += (target.x - pointer.x) * .16;
    pointer.y += (target.y - pointer.y) * .16;
    cards.forEach((card) => {
      const layer = card.querySelector<HTMLElement>('.artifact-print');
      layer?.style.setProperty('--pointer-x', `${pointer.x}px`);
      layer?.style.setProperty('--pointer-y', `${pointer.y}px`);
    });
    if (Math.abs(target.x - pointer.x) + Math.abs(target.y - pointer.y) > .04) {
      pointerFrame = requestAnimationFrame(moveParallax);
    }
  };

  const scheduleParallax = () => {
    if (!pointerFrame && visible && !document.hidden && !reducedMotion.matches) {
      pointerFrame = requestAnimationFrame(moveParallax);
    }
  };

  stackElement.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || reducedMotion.matches) return;
    const bounds = stackElement.getBoundingClientRect();
    target = {
      x: ((event.clientX - bounds.left) / bounds.width - .5) * 6,
      y: ((event.clientY - bounds.top) / bounds.height - .5) * 6,
    };
    scheduleParallax();
  }, { passive: true });

  stackElement.addEventListener('pointerleave', () => {
    target = { x: 0, y: 0 };
    scheduleParallax();
  });

  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    stackElement.classList.toggle('is-visible', visible);
    if (visible) scheduleParallax();
    else if (pointerFrame) {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }
  });
  visibilityObserver.observe(stackElement);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && pointerFrame) {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    } else scheduleParallax();
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      target = pointer = { x: 0, y: 0 };
      cards.forEach((card) => {
        const layer = card.querySelector<HTMLElement>('.artifact-print');
        layer?.style.setProperty('--pointer-x', '0px');
        layer?.style.setProperty('--pointer-y', '0px');
      });
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }
  });
}

export function initializeStacks() {
  document.querySelectorAll<HTMLElement>('.artifact-group[data-artifact-plane]').forEach(setupStack);
}
