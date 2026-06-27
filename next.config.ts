import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary doet de optimalisatie al (q_auto, f_auto, breedte-limiet in de
    // URL's). We slaan Vercel's image-optimizer over: die liep bij een foto-zware
    // galerij tegen z'n limiet aan en gaf kapotte (lege) thumbnails terug. Met
    // unoptimized laden alle thumbnails direct van Cloudinary, net als de modal.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;