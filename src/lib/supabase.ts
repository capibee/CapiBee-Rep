import { createClient } from '@supabase/supabase-js';

// Robust sanitation of Supabase URL to prevent "Invalid supabaseUrl" errors
const getValidUrl = (url: any): string => {
  if (typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }
  return 'https://rmfiorgvfqucstiiwitg.supabase.co';
};

const getValidKey = (key: any): string => {
  if (typeof key === 'string' && key.trim().length > 10) {
    return key.trim();
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZmlvcmd2ZnF1Y3N0aWl3aXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzc0NjAsImV4cCI6MjA5NDkxMzQ2MH0.hsvUyFq4PPK97Q-01cpQy5NcR-QWy743HYyxHPDb1aw';
};

const SUPABASE_URL = getValidUrl((import.meta as any).env?.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = getValidKey((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔌 Supabase initialized for project:', SUPABASE_URL);
