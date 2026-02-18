// This file is kept for backwards compatibility with api.ts
// It no longer uses Supabase, just reads from localStorage

export async function getAccessToken(): Promise<string | null> {
  // Get token from localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}
