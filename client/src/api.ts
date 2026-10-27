
const API_BASE_URL = "http://localhost:3000/api/v1";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type AuthResponse = {
  message: string;
  token?: string;
  user?: AuthUser;
  error?: string;
};

async function authRequest(
  endpoint: string,
  data: Record<string, string>,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Something went wrong. Please try again.");
  }

  return result;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  title: string,
): Promise<AuthResponse> {
  return authRequest("register", { name, email, password, title });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return authRequest("login", { email, password });
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to connect to the Hotel Booking API");
  }

  return response.json();
}

export { API_BASE_URL };
