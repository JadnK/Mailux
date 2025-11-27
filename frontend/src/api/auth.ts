export const login = async (username: string, password: string) => {
  try {
    const res = await fetch("http://localhost:5000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    return await res.json(); // z.B. { token, username }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
