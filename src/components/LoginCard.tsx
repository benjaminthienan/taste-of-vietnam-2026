"use client";

type LoginCardProps = {
  username: string;
  password: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  onLogin: () => void;
};

export default function LoginCard({
  username,
  password,
  setUsername,
  setPassword,
  onLogin,
}: LoginCardProps) {
  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

      <h1 className="text-3xl font-bold text-center text-[#0B2E82]">
        Taste of Vietnam 2026
      </h1>

      <p className="text-center text-gray-500 mt-2 mb-8">
        Staff & Organizer Login
      </p>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full rounded-xl border border-gray-300 p-3 mb-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0B2E82]"
        />

        <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-gray-300 p-3 mb-6 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0B2E82]"
        />

      <button
        onClick={onLogin}
        className="w-full rounded-xl bg-[#0B2E82] py-3 text-white font-semibold hover:bg-blue-800 transition"
      >
        Login
      </button>

    </div>
  );
}