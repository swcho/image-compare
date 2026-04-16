import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import contentStyles from './content.css?inline';
import { ImageDetector } from './ImageDetector';

function mount() {
  // Root host element (pointer-events:none so it doesn't block page interaction)
  const host = document.createElement('div');
  host.id = 'gh-img-compare-root';
  host.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(host);

  // Shadow DOM for full CSS isolation
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject Tailwind styles
  const style = document.createElement('style');
  style.textContent = contentStyles;
  shadow.appendChild(style);

  // Mount point — the App itself sets pointer-events:auto on the overlay
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Start detecting images and wiring up click handlers
  const detector = new ImageDetector();
  detector.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
