const API = import.meta.env.VITE_API_URL || "/api";

export function getToken() {
  return localStorage.getItem("travelcrm_token") || "";
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error(
      "Cannot reach the TravelCRM API. Make sure MongoDB is running/configured and the API server is running on port 4000, then refresh this page."
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data as T;
}
