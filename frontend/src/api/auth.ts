const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const getHeaders = (token?: string): HeadersInit => ({
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const login = async (username: string, password: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.username) {
      throw new Error(data.message || "Invalid credentials");
    }

    return data;
  } catch (err) {
    console.error("Login failed:", err);
    throw err;
  }
};

export const getUsers = async (token: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: getHeaders(token),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch users");
    }

    return await res.json();
  } catch (err) {
    console.error("Get users failed:", err);
    throw err;
  }
};

export const createUser = async (
  token: string,
  username: string,
  password: string
) => {
  try {
    const res = await fetch(`${API_BASE_URL}/users/create`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error("Failed to create user");
    }

    return await res.json();
  } catch (err) {
    console.error("Create user failed:", err);
    throw err;
  }
};

export const deleteUser = async (token: string, username: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/users/${username}`, {
      method: "DELETE",
      headers: getHeaders(token),
    });

    if (!res.ok) {
      throw new Error("Failed to delete user");
    }

    return await res.json();
  } catch (err) {
    console.error("Delete user failed:", err);
    throw err;
  }
};