import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@mui/x-data-grid',
    '@mui/x-data-grid-pro',
    '@mui/x-data-grid-premium',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Adicionamos o seu ID específico aqui para autorizar
        hostname: 'oaga2mlm3gci3pbj.public.blob.vercel-storage.com',
        port: '',
      },
    ],
  },
};

export default nextConfig;