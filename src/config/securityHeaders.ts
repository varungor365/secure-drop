/**
 * Security Headers Configuration
 * 
 * For production deployment, add these headers to your server.
 * Examples for common deployment scenarios:
 * - Vercel: vercel.json
 * - Netlify: netlify.toml
 * - Apache: .htaccess
 * - Nginx: nginx.conf
 */

export const securityHeaders = {
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'", // wasm-unsafe-eval for Vite
    "style-src 'self' 'unsafe-inline'", // needed for Tailwind
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join(";"),

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Prevent clickjacking
  "X-Frame-Options": "DENY",

  // Enable XSS protection in older browsers
  "X-XSS-Protection": "1; mode=block",

  // Referrer Policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions Policy (formerly Feature Policy)
  "Permissions-Policy": [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ].join(","),

  // HSTS (only for HTTPS)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/**
 * Vercel Configuration
 * Add to vercel.json
 */
export const vercelConfig = {
  headers: [
    {
      source: "/(.*)",
      headers: Object.entries(securityHeaders).map(([key, value]) => ({
        key,
        value,
      })),
    },
  ],
};

/**
 * Netlify Configuration
 * Add to netlify.toml
 */
export const netlifyConfig = `
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "${securityHeaders["Content-Security-Policy"]}"
    X-Content-Type-Options = "${securityHeaders["X-Content-Type-Options"]}"
    X-Frame-Options = "${securityHeaders["X-Frame-Options"]}"
    X-XSS-Protection = "${securityHeaders["X-XSS-Protection"]}"
    Referrer-Policy = "${securityHeaders["Referrer-Policy"]}"
`;
