import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

type LoginData = { token: string; username: string; role: string };

export default function LoginPage() {
	const navigate = useNavigate();
	const setSession = useAuth((s) => s.setSession);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const login = useMutation({
		mutationFn: () =>
			api<LoginData>("/admin/login", {
				method: "POST",
				body: JSON.stringify({ username, password }),
			}),
		onSuccess: (res) => {
			const d = res.data;
			if (!d?.token) return toast.error(res.message || "No token received");
			setSession({
				token: d.token,
				username: d.username || username,
				role: d.role || "",
			});
			void navigate({ to: "/" });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h1 className="text-xl font-semibold text-amber-400">Dear6 Admin</h1>
				<input
					className="w-full rounded-lg bg-black/30 border border-slate-600 px-3 py-2 text-sm"
					placeholder="Username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					autoComplete="username"
				/>
				<input
					className="w-full rounded-lg bg-black/30 border border-slate-600 px-3 py-2 text-sm"
					placeholder="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
					onKeyDown={(e) => e.key === "Enter" && login.mutate()}
				/>
				<button
					type="button"
					disabled={login.isPending || !username || !password}
					onClick={() => login.mutate()}
					className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black disabled:opacity-50"
				>
					{login.isPending ? "Signing in…" : "Sign in"}
				</button>
			</div>
		</div>
	);
}
