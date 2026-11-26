import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { getApiBase, setApiBase } from "../lib/auth";

type Upi = { vpa?: string | null; payeeName?: string | null };

const VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,31}$/;
const input =
	"mt-1 w-full rounded-lg bg-black/30 border border-slate-600 px-3 py-2 text-sm";
const btn =
	"rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";

export default function SettingsPage() {
	const qc = useQueryClient();

	// ----- API base URL -----
	const [apiBase, setBase] = useState(getApiBase());

	// ----- UPI -----
	const [vpa, setVpa] = useState("");
	const [payee, setPayee] = useState("");

	const upi = useQuery({
		queryKey: ["settings", "upi"],
		queryFn: async () => (await api<Upi>("/admin/settings/upi")).data ?? {},
		retry: false,
	});

	useEffect(() => {
		if (upi.data) {
			setVpa(upi.data.vpa ?? "");
			setPayee(upi.data.payeeName ?? "");
		}
	}, [upi.data]);

	const saveUpi = useMutation({
		mutationFn: (v: { vpa: string; payeeName: string }) =>
			api("/admin/settings/upi", { method: "PUT", body: JSON.stringify(v) }),
		onSuccess: () => {
			toast.success("UPI details saved");
			void qc.invalidateQueries({ queryKey: ["settings", "upi"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	function onSaveUpi() {
		const v = vpa.trim();
		const p = payee.trim();
		if (!VPA_REGEX.test(v))
			return toast.error("Enter a valid UPI ID, e.g. name@bank");
		if (p.length < 1 || p.length > 40)
			return toast.error("Payee name must be 1-40 characters");
		if (
			!confirm(
				`New deposits will be paid to:\n\n${v}\n\nMake sure this UPI ID is correct and belongs to you. Continue?`,
			)
		)
			return;
		saveUpi.mutate({ vpa: v, payeeName: p });
	}

	const usingEnv = upi.isSuccess && !upi.data?.vpa;

	return (
		<div className="max-w-lg space-y-8">
			<h1 className="text-xl font-semibold text-amber-400">Settings</h1>

			<section className="space-y-3">
				<label className="block text-sm text-slate-300">
					API base URL
					<input
						className={input}
						value={apiBase}
						onChange={(e) => setBase(e.target.value)}
					/>
				</label>
				<button
					type="button"
					className={btn}
					onClick={() => {
						setApiBase(apiBase);
						void qc.invalidateQueries();
						toast.success("Saved");
					}}
				>
					Save
				</button>
				<p className="text-xs text-slate-500">
					Example: <code>http://localhost:8080/api</code> or your LAN IP.
				</p>
			</section>

			<section className="space-y-3 border-t border-slate-700 pt-6">
				<h2 className="text-lg font-semibold text-amber-400">
					Deposit UPI details
				</h2>

				{upi.isError && (
					<div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
						{(upi.error as Error).message}
					</div>
				)}

				<label className="block text-sm text-slate-300">
					UPI ID (VPA)
					<input
						className={input}
						value={vpa}
						onChange={(e) => setVpa(e.target.value)}
						placeholder={usingEnv ? "Using server default (.env)" : "name@bank"}
						disabled={!upi.isSuccess}
						autoComplete="off"
						spellCheck={false}
					/>
				</label>
				<label className="block text-sm text-slate-300">
					Payee name
					<input
						className={input}
						value={payee}
						onChange={(e) => setPayee(e.target.value)}
						placeholder={usingEnv ? "Using server default (.env)" : "DEAR 6"}
						disabled={!upi.isSuccess}
						maxLength={40}
					/>
				</label>
				<button
					type="button"
					className={btn}
					onClick={onSaveUpi}
					disabled={!upi.isSuccess || saveUpi.isPending}
				>
					{saveUpi.isPending ? "Saving…" : "Save UPI details"}
				</button>
				<p className="text-xs text-slate-500">
					Applies to new deposits immediately. Existing deposits keep the UPI ID
					they were issued with. If empty, the server falls back to UPI_VPA /
					UPI_PAYEE_NAME from its environment.
				</p>
			</section>
		</div>
	);
}
