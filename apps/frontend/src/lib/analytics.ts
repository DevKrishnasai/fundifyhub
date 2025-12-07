// Type declaration for Google Tag Manager dataLayer
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export const trackEvent = (eventName: string, payload: Record<string, unknown> = {}): void => {
  // Lightweight analytics helper: push to dataLayer if available, otherwise console.log
  try {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...payload });
    } else {
      console.info('[analytics]', eventName, payload);
    }
  } catch (e) {
    // swallow to avoid breaking UX
    // but log in dev
    // eslint-disable-next-line no-console
    console.info('[analytics:error]', eventName, payload, e);
  }
};
