import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '165.227.137.145',
        port: '',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '165.227.137.145',
        port: '8080',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
