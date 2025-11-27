import { useState } from "react";
import { login } from "../api/auth";

interface Props {
  onLogin: (user: { username: string }) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login(username, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      onLogin(data.username);
    } catch {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-100">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded shadow-lg w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-purple-400">Login to Mailux</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
          required
        />
        <button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">
          Login
        </button>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
};

export default LoginPage;
