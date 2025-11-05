/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001/graphql',
    NEXT_PUBLIC_QUESTION_GRAPHQL_URL: process.env.NEXT_PUBLIC_QUESTION_GRAPHQL_URL || 'http://localhost:4002/graphql',
    NEXT_PUBLIC_MATCHING_GRAPHQL_URL: process.env.NEXT_PUBLIC_MATCHING_GRAPHQL_URL || 'http://localhost:4003/graphql',
    NEXT_PUBLIC_COLLABORATION_GRAPHQL_URL: process.env.NEXT_PUBLIC_COLLABORATION_GRAPHQL_URL || 'http://localhost:4004/graphql',
  },
};

module.exports = nextConfig;
