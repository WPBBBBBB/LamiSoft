"use client";
// Import stable polyfills based on Browserslist targets.
// core-js stable covers most modern polyfills; add regenerator if you need generator/runtime support.
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Patch performance.measure to silently ignore "end cannot be negative" errors
// that can be thrown by React 19 / Next.js Turbopack internal profiling.
if (typeof window !== "undefined" && typeof performance !== "undefined" && typeof performance.measure === "function") {
  const _originalMeasure = performance.measure.bind(performance);
  performance.measure = function (
    measureName: string,
    startOrOptions?: string | PerformanceMeasureOptions,
    endMark?: string
  ): PerformanceMeasure {
    try {
      return _originalMeasure(measureName, startOrOptions as string, endMark as string);
    } catch {
      // Return a dummy PerformanceMeasure to satisfy callers
      return { name: measureName, entryType: "measure", startTime: 0, duration: 0, detail: null, toJSON: () => ({}) } as PerformanceMeasure;
    }
  };
}

export default function PolyfillsClient(): null {
  // This component's sole purpose is to ensure the polyfills are loaded on the client.
  return null;
}
