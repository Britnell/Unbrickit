import Alpine from 'alpinejs';

const pages = ['clock', 'timer'];
Alpine.data('app', () => ({
  page: pages[0],
}));
