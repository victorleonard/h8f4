function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const close = document.getElementById('menu-close');
  const menu = document.getElementById('mobile-menu');
  const links = menu?.querySelectorAll('a');

  if (!toggle || !menu) return;

  const open = () => {
    menu.classList.remove('pointer-events-none', 'translate-x-full');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const shut = () => {
    menu.classList.add('pointer-events-none', 'translate-x-full');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', open);
  close?.addEventListener('click', shut);
  links?.forEach((link) => link.addEventListener('click', shut));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') shut();
  });
}

function initHeroPhoto() {
  const dataEl = document.querySelector<HTMLScriptElement>('[data-hero-photos]');
  const image = document.querySelector<HTMLImageElement>('[data-hero-image]');
  if (!dataEl || !image) return;

  const webpSource = document.querySelector<HTMLSourceElement>('[data-hero-webp]');
  const photos = JSON.parse(dataEl.textContent ?? '[]') as {
    srcHero: string;
    srcsetJpeg: string;
    srcsetWebp: string;
    alt: string;
  }[];
  if (photos.length <= 1) return;

  const applyHeroPhoto = (photo: (typeof photos)[number]) => {
    image.src = photo.srcHero;
    image.srcset = photo.srcsetJpeg;
    if (webpSource) webpSource.srcset = photo.srcsetWebp;
  };

  const preloadHeroPhoto = (photo: (typeof photos)[number]) => {
    const preload = new Image();
    preload.src = photo.srcHero;
  };

  let index = Number(image.dataset.heroIndex);
  if (Number.isNaN(index)) {
    index = Math.floor(Math.random() * photos.length);
    applyHeroPhoto(photos[index]);
    image.dataset.heroIndex = String(index);
  }

  preloadHeroPhoto(photos[(index + 1) % photos.length]);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const intervalMs = 20000;
  const fadeMs = 600;

  window.setInterval(() => {
    index = (index + 1) % photos.length;
    image.style.opacity = '0';

    window.setTimeout(() => {
      applyHeroPhoto(photos[index]);
      preloadHeroPhoto(photos[(index + 1) % photos.length]);
      image.style.opacity = '1';
    }, fadeMs);
  }, intervalMs);
}

function initHeroViewport() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const lockHeight = () => {
    hero.style.setProperty('--hero-h', `${window.innerHeight}px`);
  };

  lockHeight();
  window.addEventListener('orientationchange', () => {
    window.setTimeout(lockHeight, 150);
  });
}

function initNavHighlight() {
  const sections = ['hero', 'a-propos', 'repertoire', 'medias', 'contact'];
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((link) => {
            const active = link.dataset.section === id;
            link.classList.toggle('text-accent', active);
            link.classList.toggle('underline', active);
            link.classList.toggle('underline-offset-4', active);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -50% 0px' },
  );

  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function initForm() {
  const wrapper = document.querySelector<HTMLElement>('[data-contact-form]');
  const form = wrapper?.querySelector<HTMLFormElement>('[data-form]');
  if (!wrapper || !form || !form.action) return;

  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const success = wrapper.querySelector<HTMLElement>('[data-form-success]');
  const error = wrapper.querySelector<HTMLElement>('[data-form-error]');
  const retry = wrapper.querySelector<HTMLButtonElement>('[data-form-retry]');
  const submitLabel = submit?.dataset.submitLabel ?? 'Envoyer la demande';

  const showForm = () => {
    form.classList.remove('contact-form__fields--hidden');
    success?.classList.add('hidden');
    error?.classList.add('hidden');
  };

  const showFeedback = (panel: HTMLElement | null) => {
    form.classList.add('contact-form__fields--hidden');
    success?.classList.add('hidden');
    error?.classList.add('hidden');
    panel?.classList.remove('hidden');
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  retry?.addEventListener('click', () => {
    showForm();
    form.querySelector<HTMLElement>('[name="name"]')?.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    showForm();
    submit?.setAttribute('disabled', 'true');
    submit?.setAttribute('aria-busy', 'true');
    if (submit) submit.textContent = 'Envoi en cours…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error('submit failed');

      form.reset();
      showFeedback(success);
    } catch {
      showFeedback(error);
    } finally {
      submit?.removeAttribute('disabled');
      submit?.removeAttribute('aria-busy');
      if (submit) submit.textContent = submitLabel;
    }
  });
}

function initVideoPlayers() {
  document.querySelectorAll<HTMLElement>('[data-video-card]').forEach((card) => {
    const video = card.querySelector<HTMLVideoElement>('[data-video-player]');
    const preview = card.querySelector<HTMLButtonElement>('[data-video-preview]');
    if (!video) return;

    const applyOrientation = () => {
      if (card.dataset.orientation) return;

      const { videoWidth, videoHeight } = video;
      if (!videoWidth || !videoHeight) return;

      card.dataset.orientation = videoHeight > videoWidth ? 'portrait' : 'landscape';
    };

    const revealPlayer = () => {
      preview?.remove();
      video.classList.remove('video-card__player--hidden');
      void video.play();
    };

    preview?.addEventListener('click', () => {
      revealPlayer();
      if (video.readyState >= 1) {
        applyOrientation();
      } else {
        video.addEventListener('loadedmetadata', applyOrientation, { once: true });
      }
    });

    video.addEventListener('loadedmetadata', applyOrientation, { once: true });
  });
}

function initPhotoGallery() {
  document.querySelectorAll<HTMLElement>('[data-photo-gallery]').forEach((gallery) => {
    const dataEl = gallery.querySelector<HTMLScriptElement>('[data-gallery-photos]');
    const lightbox = gallery.querySelector<HTMLElement>('[data-photo-lightbox]');
    const image = gallery.querySelector<HTMLImageElement>('[data-lightbox-image]');
    const caption = gallery.querySelector<HTMLElement>('[data-lightbox-caption]');
    const counter = gallery.querySelector<HTMLElement>('[data-lightbox-counter]');
    const prev = gallery.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
    const next = gallery.querySelector<HTMLButtonElement>('[data-lightbox-next]');
    const figure = gallery.querySelector<HTMLElement>('[data-lightbox-figure]');
    const slider = gallery.querySelector<HTMLElement>('[data-photo-slider]');
    const track = gallery.querySelector<HTMLElement>('[data-photo-track]');
    const dots = gallery.querySelectorAll<HTMLElement>('[data-photo-dot]');
    const openButtons = gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-open]');
    const closeButtons = gallery.querySelectorAll<HTMLElement>('[data-lightbox-close]');

    if (!dataEl || !lightbox || !image) return;

    const photos = JSON.parse(dataEl.textContent ?? '[]') as { srcLarge: string; alt: string }[];
    if (photos.length === 0) return;

    let index = 0;
    let lightboxTouchStartX = 0;
    let lightboxTouchStartY = 0;
    let sliderTouchStartX = 0;
    let sliderTouchStartY = 0;

    const update = () => {
      const photo = photos[index];
      image.src = photo.srcLarge;
      image.alt = photo.alt;
      if (caption) caption.textContent = photo.alt;
      if (counter) counter.textContent = `${index + 1} / ${photos.length}`;
      prev?.toggleAttribute('disabled', index === 0);
      next?.toggleAttribute('disabled', index === photos.length - 1);
      if (track) track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
      track?.querySelectorAll<HTMLElement>('.photo-gallery__slide').forEach((slide, i) => {
        slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      dots.forEach((dot) => {
        dot.classList.toggle('photo-gallery__dot--active', Number(dot.dataset.photoDot) === index);
      });
    };

    const open = (i: number) => {
      index = i;
      update();
      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lightbox.querySelector<HTMLButtonElement>('[data-lightbox-close]')?.focus();
    };

    const close = () => {
      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      openButtons[index]?.focus();
    };

    const goTo = (i: number) => {
      const nextIndex = Math.max(0, Math.min(photos.length - 1, i));
      if (nextIndex === index) return;
      index = nextIndex;
      update();
    };

    const onSliderTouchStart = (e: TouchEvent) => {
      sliderTouchStartX = e.touches[0]?.clientX ?? 0;
      sliderTouchStartY = e.touches[0]?.clientY ?? 0;
    };

    const onSliderTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0]?.clientX ?? 0;
      const touchEndY = e.changedTouches[0]?.clientY ?? 0;
      const deltaX = touchEndX - sliderTouchStartX;
      const deltaY = touchEndY - sliderTouchStartY;

      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      if (deltaX < 0) goTo(index + 1);
      else goTo(index - 1);
    };

    const onLightboxTouchStart = (e: TouchEvent) => {
      lightboxTouchStartX = e.touches[0]?.clientX ?? 0;
      lightboxTouchStartY = e.touches[0]?.clientY ?? 0;
    };

    const onLightboxTouchEnd = (e: TouchEvent) => {
      if (lightbox.hidden) return;

      const touchEndX = e.changedTouches[0]?.clientX ?? 0;
      const touchEndY = e.changedTouches[0]?.clientY ?? 0;
      const deltaX = touchEndX - lightboxTouchStartX;
      const deltaY = touchEndY - lightboxTouchStartY;

      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      if (deltaX < 0) goTo(index + 1);
      else goTo(index - 1);
    };

    openButtons.forEach((btn) => {
      btn.addEventListener('click', () => open(Number(btn.dataset.galleryOpen)));
    });

    closeButtons.forEach((btn) => btn.addEventListener('click', close));
    prev?.addEventListener('click', () => goTo(index - 1));
    next?.addEventListener('click', () => goTo(index + 1));

    slider?.addEventListener('touchstart', onSliderTouchStart, { passive: true });
    slider?.addEventListener('touchend', onSliderTouchEnd, { passive: true });

    figure?.addEventListener('touchstart', onLightboxTouchStart, { passive: true });
    figure?.addEventListener('touchend', onLightboxTouchEnd, { passive: true });

    update();

    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;

      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    });
  });
}

function initCleanHeroHash() {
  if (window.location.hash !== '#hero') return;
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function initHomeLinks() {
  document.querySelectorAll<HTMLAnchorElement>('[data-home-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = new URL(link.href);
      const current = new URL(window.location.href);
      if (target.pathname !== current.pathname) return;

      e.preventDefault();
      history.replaceState(null, '', `${target.pathname}${target.search}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('mobile-menu')?.classList.add('pointer-events-none', 'translate-x-full');
      document.getElementById('mobile-menu')?.setAttribute('aria-hidden', 'true');
      document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

initCleanHeroHash();
initHomeLinks();
initMobileMenu();
initHeroPhoto();
initHeroViewport();
initNavHighlight();
initForm();
initVideoPlayers();
initPhotoGallery();
