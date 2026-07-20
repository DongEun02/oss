type AnalyticsParameter = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
let initialized = false;

const isAnalyticsEnabled = () => (
  import.meta.env.PROD
  && typeof window !== "undefined"
  && !!measurementId
  && !localHostnames.has(window.location.hostname)
);

const sanitizeParameters = (
  parameters: Record<string, AnalyticsParameter | null | undefined>
): Record<string, AnalyticsParameter> => Object.fromEntries(
  Object.entries(parameters).flatMap(([key, value]) => {
    if (value === null || value === undefined) return [];
    return [[key, typeof value === "string" ? value.slice(0, 100) : value]];
  })
);

export const initializeAnalytics = () => {
  if (!isAnalyticsEnabled() || initialized) return;

  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.gaMeasurementId = measurementId;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId);
};

export const trackAnalyticsEvent = (
  eventName: string,
  parameters: Record<string, AnalyticsParameter | null | undefined> = {}
) => {
  if (!initialized || !window.gtag) return;
  window.gtag("event", eventName, sanitizeParameters(parameters));
};
