import '../style.css';
import Way from './framework';
import './clock';

Way.render(document.body, window.pageprops);

Way.store('theme', () => {
  const fontSize = Way.signal(28);
  return {
    fontSize,
  };
});
