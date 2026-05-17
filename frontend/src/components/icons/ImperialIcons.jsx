/** Ícones SVG uniformes — verde Imperial, sem emojis. */
const PATHS = {
  dashboard: (
    <path d="M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 6h7v10h-7V10zM4 13h7v7H4v-7z" />
  ),
  package: (
    <path d="M12 2 4 6v12l8 4 8-4V6l-8-4zm0 2.2 5.5 2.75L12 9.7 6.5 6.95 12 4.2zM6 8.5l6 3 6-3V17l-6 3-6-3V8.5z" />
  ),
  clipboard: (
    <path d="M9 3h6a2 2 0 012 2h2a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012-2zm2 0v2h2V3h-2zm-4 4v12h12V7H7zm2 3h8v2H9v-2zm0 4h8v2H9v-2z" />
  ),
  user: (
    <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 2.13-7 4.75V22h14v-3.25C19 16.13 15.87 14 12 14z" />
  ),
  printer: (
    <path d="M18 8h-1V4H7v4H6a4 4 0 00-4 4v5h2v5h14v-5h2v-5a4 4 0 00-4-4zm-9-2h6v2H9V6zm11 11H6v-4h14v4z" />
  ),
  antenna: (
    <path d="M12 3C7.03 3 3 7.03 3 12h2a7 7 0 0114 0h2c0-4.97-4.03-9-9-9zm0 4c-2.76 0-5 2.24-5 5h2a3 3 0 016 0h2c0-2.76-2.24-5-5-5zm0 4c-1.1 0-2 .9-2 2h4c0-1.1-.9-2-2-2zm-1 5h2v4h-2v-4z" />
  ),
  currency: (
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6zm0-8h-2V3h2v2z" />
  ),
  document: (
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2.5L18.5 9H13V4.5zM6 20V4h5v7h7v9H6z" />
  ),
  chart: (
    <path d="M5 19V9h4v10H5zm6 0V5h4v14h-4zm6 0v-7h4v7h-4z" />
  ),
  menu: <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />,
  logout: (
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 00-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  ),
  trendUp: <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />,
  trendDown: <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" />,
  close: (
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
  ),
};

export default function ImperialIcon({ name, className = 'w-5 h-5', ...props }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      {...props}
    >
      {path}
    </svg>
  );
}

export function IconBox({ name, size = 'md', className = '' }) {
  const box =
    size === 'lg' ? 'icon-box-lg' : size === 'sm' ? 'icon-box-sm' : 'icon-box';
  const icon =
    size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <span className={`${box} ${className}`}>
      <ImperialIcon name={name} className={icon} />
    </span>
  );
}
