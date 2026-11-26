import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, fmtDate, money } from "../lib/api";

type Deposit = {
	id: string;
	amount: string;
	bonusAmount: string;
	status: string;
	isFirstDeposit: boolean;
	createdAt: string;
	orderId?: string | null;
};

type Withdrawal = {
	id: string;
	amount: string;
	method?: string | null;
	status: string;
	createdAt: string;
};

type Kind = "deposits" | "withdrawals";
type ProcessVars = {
	id: string;
	status: "APPROVED" | "REJECTED";
	adminNote?: string;
};

function useProcess(kind: Kind) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (v: ProcessVars) =>
			api(`/admin/${kind}/${v.id}/process`, {
				method: "POST",
				body: JSON.stringify({
					status: v.status,
					adminNote: v.adminNote ?? "",
				}),
			}),
		onSuccess: (res, v) => {
			toast.success(
				res.message || (v.status === "APPROVED" ? "Approved" : "Rejected"),
			);
			void qc.invalidateQueries({ queryKey: [kind] });
			void qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

function Actions({
	amount,
	busy,
	onProcess,
}: {
	amount: string;
	busy: boolean;
	onProcess: (status: "APPROVED" | "REJECTED", note?: string) => void;
}) {
	return (
		<div className="flex gap-2">
			<button
				type="button"
				disabled={busy}
				onClick={() => {
					if (
						confirm(
							`Approve ${money(amount)}? Make sure the money has been verified.`,
						)
					) {
						onProcess("APPROVED");
					}
				}}
				className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
			>
				Approve
			</button>
			<button
				type="button"
				disabled={busy}
				onClick={() => {
					const note = prompt("Reason for rejecting (optional)");
					if (note !== null) onProcess("REJECTED", note);
				}}
				className="rounded-lg border border-red-500/60 px-3 py-1.5 text-xs text-red-400 disabled:opacity-50"
			>
				Reject
			</button>
		</div>
	);
}

function Empty({ text }: { text: string }) {
	return (
		<div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
			{text}
		</div>
	);
}

function DepositsList() {
	const process = useProcess("deposits");
	const { data, isLoading, error } = useQuery({
		queryKey: ["deposits", "pending"],
		queryFn: async () =>
			(await api<Deposit[]>("/admin/deposits/pending")).data ?? [],
		refetchInterval: 20_000,
	});

	if (isLoading) return <div className="text-slate-400">Loading…</div>;
	if (error)
		return <div className="text-red-400">{(error as Error).message}</div>;
	if (!data?.length) return <Empty text="No pending deposits" />;

	return (
		<div className="space-y-3">
			{data.map((d) => (
				<div
					key={d.id}
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
				>
					<div className="space-y-1">
						<div className="text-lg font-semibold text-slate-100">
							{money(d.amount)}
							{d.isFirstDeposit && (
								<span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
									First deposit · bonus {money(d.bonusAmount)}
								</span>
							)}
						</div>
						<div className="text-xs text-slate-400">
							Order: {d.orderId || d.id}
						</div>
						<div className="text-xs text-slate-500">{fmtDate(d.createdAt)}</div>
					</div>
					<Actions
						amount={d.amount}
						busy={process.isPending && process.variables?.id === d.id}
						onProcess={(status, adminNote) =>
							process.mutate({ id: d.id, status, adminNote })
						}
					/>
				</div>
			))}
		</div>
	);
}

function WithdrawalsList() {
	const process = useProcess("withdrawals");
	const { data, isLoading, error } = useQuery({
		queryKey: ["withdrawals", "pending"],
		queryFn: async () =>
			(await api<Withdrawal[]>("/admin/withdrawals/pending")).data ?? [],
		refetchInterval: 20_000,
	});

	if (isLoading) return <div className="text-slate-400">Loading…</div>;
	if (error)
		return <div className="text-red-400">{(error as Error).message}</div>;
	if (!data?.length) return <Empty text="No pending withdrawals" />;

	return (
		<div className="space-y-3">
			{data.map((w) => (
				<div
					key={w.id}
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
				>
					<div className="space-y-1">
						<div className="text-lg font-semibold text-slate-100">
							{money(w.amount)}
						</div>
						<div className="text-xs text-slate-400">
							Method: {w.method || "—"}
						</div>
						<div className="text-xs text-slate-500">{fmtDate(w.createdAt)}</div>
					</div>
					<Actions
						amount={w.amount}
						busy={process.isPending && process.variables?.id === w.id}
						onProcess={(status, adminNote) =>
							process.mutate({ id: w.id, status, adminNote })
						}
					/>
				</div>
			))}
		</div>
	);
}

export default function MoneyPage() {
	const [tab, setTab] = useState<Kind>("deposits");

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold text-amber-400">
				Deposits & Withdrawals
			</h1>
			<div className="flex gap-2">
				{(["deposits", "withdrawals"] as const).map((k) => (
					<button
						key={k}
						type="button"
						onClick={() => setTab(k)}
						className={`rounded-lg px-4 py-2 text-sm capitalize ${
							tab === k
								? "bg-amber-500 font-semibold text-black"
								: "border border-slate-700 text-slate-300"
						}`}
					>
						{k}
					</button>
				))}
			</div>
			{tab === "deposits" ? <DepositsList /> : <WithdrawalsList />}
		</div>
	);
}
