export const login = async (username: string, password: string) => {
  try {
    const res = await fetch("http://jadenk.de:5000/api/login", {
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
