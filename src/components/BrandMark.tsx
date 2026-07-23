import React from "react";

const SITE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171717"/><path d="M9.5 8v8.2c0 4.3 3.5 7.8 7.8 7.8H23M9.5 14.5h6.2c4 0 7.3-3.3 7.3-7.3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="7" r="2.3" fill="#ff765f"/><circle cx="23" cy="7" r="2.3" fill="#53b88a"/><circle cx="23" cy="24" r="2.3" fill="#8c72c5"/></svg>`;
export const SITE_ICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(SITE_ICON_SVG)}`;

export const BrandMark = () => (
  <svg className="brand-mark-svg" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#171717" />
    <path
      d="M9.5 8v8.2c0 4.3 3.5 7.8 7.8 7.8H23M9.5 14.5h6.2c4 0 7.3-3.3 7.3-7.3"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9.5" cy="7" r="2.3" fill="#ff765f" />
    <circle cx="23" cy="7" r="2.3" fill="#53b88a" />
    <circle cx="23" cy="24" r="2.3" fill="#8c72c5" />
  </svg>
);
