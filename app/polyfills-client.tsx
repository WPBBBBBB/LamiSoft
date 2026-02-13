"use client";
// Import stable polyfills based on Browserslist targets.
// core-js stable covers most modern polyfills; add regenerator if you need generator/runtime support.
import 'core-js/stable';
import 'regenerator-runtime/runtime';

export default function PolyfillsClient(): null {
  // This component's sole purpose is to ensure the polyfills are loaded on the client.
  return null;
}
