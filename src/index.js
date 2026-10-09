// toggle mobile nav menu
document
  .querySelector('[aria-controls="mobile-menu"]')
  ?.addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    const open = menu.classList.toggle('hidden') === false;
    menu.classList.toggle('flex', open);
    document
      .querySelector('[aria-controls="mobile-menu"]')
      ?.setAttribute('aria-expanded', String(open));
  });
