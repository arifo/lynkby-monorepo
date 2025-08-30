import healthRouter from '../src/routes/health.routes';

async function main() {
  const req = new Request('http://local/_health');
  // Provide minimal env. Intentionally omit DATABASE_URL to avoid network access;
  // route should still respond and report database: "unhealthy".
  const env: any = { NODE_ENV: 'development' };
  const res = await (healthRouter as any).fetch(req, env, { waitUntil() {} });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

