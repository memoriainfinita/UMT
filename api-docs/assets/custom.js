/* global document */
// API docs: show the toolbar title as the demo's brand, "UMT" plus the version.
const title = document.querySelector('.tsd-page-toolbar .title');
if (title) {
  const version = title.textContent.match(/ - (v[\d.]+)\s*$/);
  title.setAttribute('aria-label', title.textContent.trim());
  title.innerHTML = '<b>UMT</b>' + (version ? `<span>${version[1]}</span>` : '');
}

// The site menu's first link repeats the project name; it leads to the overview (README).
const home = document.querySelector('.site-menu > nav:not(#tsd-sidebar-links) > a');
if (home) home.textContent = 'Overview';

// The overview page repeats the project name above the README's own title.
const pageTitle = document.querySelector('.tsd-page-title');
if (pageTitle && document.querySelector('.col-content > .tsd-panel.tsd-typography h1')) pageTitle.hidden = true;

// A breadcrumb with only the current page adds nothing.
const crumbs = document.querySelectorAll('.tsd-breadcrumb li');
if (crumbs.length === 1) crumbs[0].closest('.tsd-breadcrumb').hidden = true;
