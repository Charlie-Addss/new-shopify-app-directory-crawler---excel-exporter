/**
 * Centralized API helper supporting custom backend host for decoupled frontend deployments
 * (e.g., Frontend hosted on GitHub Pages and Backend hosted on Render/Railway/Fly.io)
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const targetUrl = apiUrl(input);
  return fetch(targetUrl, init);
}
