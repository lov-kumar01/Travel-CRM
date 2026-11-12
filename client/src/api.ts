const API = import.meta.env.VITE_API_URL || "/api";

export function getToken() {
  return localStorage.getItem("travelcrm_token") || "";
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      cache: options.cache ?? "no-store",
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
  if (!response.ok) {
    const validationErrors = Array.isArray(data.errors)
      ? data.errors.map((issue: { path?: unknown[]; message?: string }) => {
          const field = Array.isArray(issue.path) ? issue.path.join(".") : "";
          return `${field ? `${field}: ` : ""}${issue.message || "Invalid value"}`;
        }).filter(Boolean)
      : [];
    const message = validationErrors.length > 1
      ? validationErrors.join("; ")
      : data.message || validationErrors[0] || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}
