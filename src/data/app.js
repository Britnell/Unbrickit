import Alpine from 'alpinejs';

const pages = ['clock', 'timer', 'alarm'];
Alpine.data('app', () => ({
  page: 'alarm',
  menu: '',
  showMenu: false,
}));
