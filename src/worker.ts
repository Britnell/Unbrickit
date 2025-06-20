import { Hono } from 'hono';

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
  console.log('/habit');
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

// app.use('*', serveStatic({ root: './dist' }));

export default app;
