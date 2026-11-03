/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const nextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${backendUrl}/api/product-images/:path*`,
      },
    ];
  },
};

export default nextConfig;
