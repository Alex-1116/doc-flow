export const config = {
  apiUrl: import.meta.env.VITE_API_URL || window.location.origin.replace(':3000', ':8080') || 'http://localhost:8080',
};

export function getApiUrl(): string {
  return config.apiUrl;
}
