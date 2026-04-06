import * as UMT from './index';

// Attach to window for browser usage (CDN/script tag)
if (typeof window !== 'undefined') {
  (window as any).UMT = UMT;
}

export default UMT;
export * from './index';
