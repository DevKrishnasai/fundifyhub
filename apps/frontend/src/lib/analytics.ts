export const trackEvent = (eventName: string, payload: Record<string, any> = {}) => {
  // Lightweight analytics helper: push to dataLayer if available, otherwise console.log
  try {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({ event: eventName, ...payload });
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
