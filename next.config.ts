import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@google-cloud/bigquery', 'google-auth-library', 'google-gax', '@grpc/grpc-js', 'protobufjs', 'gtoken', 'gcp-metadata'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@google-cloud/bigquery': 'commonjs @google-cloud/bigquery',
        'google-auth-library': 'commonjs google-auth-library',
        'google-gax': 'commonjs google-gax',
        'gtoken': 'commonjs gtoken',
        'gcp-metadata': 'commonjs gcp-metadata',
      });
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
