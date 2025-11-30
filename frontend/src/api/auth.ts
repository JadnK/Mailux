export const login = async (username: string, password: string) => {
  try {
    const res = await fetch("http:///host.docker.internal:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!data.username) {
      throw new Error("Invalid credentials");
    }

    return data;
  } catch (err) {
    console.error("Login failed:", err);
    throw err;
  }
};

export const getUsers = async (token: string) => {
  try {
    const res = await fetch("http:///host.docker.internal:5000/api/users", {
      headers: { "Authorization": `Bearer ${token}` },
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

export const createUser = async (token: string, username: string, password: string) => {
  try {
    const res = await fetch("http:///host.docker.internal:5000/api/users/create", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
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
