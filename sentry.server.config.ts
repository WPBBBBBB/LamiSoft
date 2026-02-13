import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // server-side specific options can be added here
});

export default Sentry;
