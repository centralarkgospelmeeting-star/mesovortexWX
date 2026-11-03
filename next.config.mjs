export default {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  }
};
