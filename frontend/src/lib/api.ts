import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Keep these exports for backward compatibility with any imports
export function setAccessToken(_token: string | null) {}
export function getAccessToken(): string | null { return null; }

