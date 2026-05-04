import * as UMT from './index';

// Attach to window for browser usage (CDN/script tag)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).UMT = UMT;
}

export default UMT;
export * from './index';
