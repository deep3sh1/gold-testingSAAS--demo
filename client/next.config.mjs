const apiTarget =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiTarget}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
