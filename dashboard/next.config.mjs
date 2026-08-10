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

  async headers() {
    return [
      {
        /* The dashboard holds customer contact details and can push code.
           Nothing here should ever be framed or indexed. */
        source: "/:path*",
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
