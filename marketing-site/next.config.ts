/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Habilita Exportação Estática para Hostinger Shared Hosting
  images: {
    unoptimized: true, // Necessário para 'output: export'
    domains: ['images.unsplash.com'],
  },
};

export default nextConfig;
