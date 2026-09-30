/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // The operator dashboard now lives on the main Web99 domain at
  // https://web99.ie/control. Keeping this as a real Next basePath means all
  // dashboard navigation and _next assets remain namespaced away from the
  // public marketing site. Nginx exposes selected public aliases such as
  // /api/chat and /demo/* without needing a second dashboard hostname.
  basePath: "/control",

  // Middleware buffers the request body before it reaches the route handler,
  // capped at 10MB by default — too small for Sarah-chat file uploads
  // (photos/documents up to 100MB). Raised to match.
  experimental: {
    middlewareClientMaxBodySize: "105mb",
  },

  async headers() {
    return [
      {
        /* The dashboard holds customer contact details and can push code.
           Nothing here should ever be framed or indexed. (The customer-site view
           route is excluded: it sets its own headers, and the chat frames it.) */
        source: "/:path((?!api/instant-site/view/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
