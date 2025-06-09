import { Hono } from 'hono';
import { renderPage } from './renderer';

interface Env {
  DB: any;
}

const app = new Hono<{ Bindings: Env }>();

// API Routes
const api = new Hono<{ Bindings: Env }>();

api.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();

  console.log('Login attempt for:', email, 'with password length:', password?.length);

  return c.json({
    success: true,
    token: 'mock-jwt-token',
    user: { id: 1, email },
  });
});

api.get('/habits', async (c) => {
  return c.json([
    { id: 1, name: 'Exercise', completed: false, streak: 5 },
    { id: 2, name: 'Read', completed: true, streak: 12 },
  ]);
});

api.post('/habits', async (c) => {
  const habit = await c.req.json();

  return c.json({ id: Date.now(), ...habit });
});

app.route('/api', api);

// HTML Routes - these will be served with Vite integration
app.get('/', async (c) => {
  console.log('/HOME');

  const content = `
  <div id="app">
  <h1>Welcome to Unbrickit</h1>
  <p>Your habit tracking app</p>
  </div>
  `;
  return c.html(renderPage('Unbrickit - Home', content, 'src/index.js'));
});

app.get('/app', async (c) => {
  console.log('/APP');
  const content = `
    <div id="app">
      <h1>Habit Tracker</h1>
      <div x-data="habitApp()">
        <!-- Your Alpine.js app content here -->
      </div>
    </div>
  `;
  return c.html(renderPage('Unbrickit - App', content, 'src/app.js'));
});

export default app;
