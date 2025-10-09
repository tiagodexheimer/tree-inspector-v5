import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [
    '@mui/x-data-grid',
    '@mui/x-data-grid-pro',
    '@mui/x-data-grid-premium',
  ],
  
};


export default nextConfig;
