// Configuration for the web app
// This file works with static export since it's processed at build time

export const config = {
  api: {
    app: process.env.NEXT_PUBLIC_APP_API_BASE || 'https://app.lynkby.com',
    service: process.env.NEXT_PUBLIC_API_BASE || 'https://lynkby-api.arifento85.workers.dev',
  },
  app: {
    name: 'Lynkby',
    description: 'Ultra-fast landing pages that auto-sync your TikToks',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://lynkby.com',
  },
  apiService: {
    name: 'Lynkby API',
    description: 'API service for profile serving and caching',
    url: process.env.NEXT_PUBLIC_API_URL || 'https://lynkby-api.arifento85.workers.dev',
  }
};

export function getAppApiUrl(): string {
  return config.api.app;
}

export function getApiUrl(): string {
  return config.api.service;
}
