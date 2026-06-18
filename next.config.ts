import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
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
