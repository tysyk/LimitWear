export interface PublicUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  telegramUsername?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: PublicUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  return sendAuthRequest('/auth/register', payload);
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  return sendAuthRequest('/auth/login', payload);
}

export async function getCurrentUser(): Promise<AuthResponse> {
  return sendRequest<AuthResponse>('/auth/me', {
    method: 'GET',
  });
}

export async function logoutUser(): Promise<{ success: boolean }> {
  return sendRequest<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

async function sendAuthRequest<TPayload extends object>(
  path: string,
  payload: TPayload,
): Promise<AuthResponse> {
  return sendRequest<AuthResponse>(path, {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

async function sendRequest<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
