import { createClient } from '@supabase/supabase-js';

// Robust sanitation of Supabase URL to prevent "Invalid supabaseUrl" errors
const getValidUrl = (url: any): string => {
  if (typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }
  return '';
};

const getValidKey = (key: any): string => {
  if (typeof key === 'string' && key.trim().length > 10) {
    return key.trim();
  }
  return '';
};

const SUPABASE_URL = getValidUrl(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = getValidKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Faltan las variables de entorno de Supabase (VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY). La conexión fallará.');
}

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder-key');

console.log('🔌 Supabase initialized for project:', SUPABASE_URL);
