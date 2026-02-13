import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // You can add more options here, e.g. release, attachStacktrace, integrations
});

export default Sentry;
