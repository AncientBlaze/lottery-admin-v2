import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api, money } from "../lib/api";

type Stats = {
	totalUsers: number;
	activeUsers: number;
	todaySales: string;
	todayProfit: string;
	todayWinners: number;
	currentJackpot: string;
	totalDeposits: string;
	totalWithdrawals: string;
	pendingWithdrawals: number;
	pendingDeposits: number;
};

function Stat({
	label,
	value,
	alert,
}: {
	label: string;
	value: string | number;
	alert?: boolean;
}) {
	return (
		<div
			className={`rounded-xl border p-4 ${alert ? "border-amber-500/60 bg-amber-500/10" : "border-slate-800 bg-slate-900"}`}
		>
			<div className="text-xs text-slate-400">{label}</div>
			<div
				className={`mt-1 text-2xl font-semibold ${alert ? "text-amber-400" : "text-slate-100"}`}
			>
				{value}
			</div>
		</div>
	);
}

export default function DashboardPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["dashboard"],
		queryFn: async () => (await api<Stats>("/admin/dashboard")).data!,
		refetchInterval: 30_000,
	});

	if (isLoading) return <div className="text-slate-400">Loading…</div>;
	if (error || !data)
		return (
			<div className="text-red-400">
				{(error as Error)?.message || "Failed to load"}
			</div>
		);

	return (
		<div className="space-y-6">
			<h1 className="text-xl font-semibold text-amber-400">Dashboard</h1>

			<section>
				<h2 className="mb-2 text-sm text-slate-400">Needs action</h2>
				<div className="grid grid-cols-2 gap-3">
					<Link to="/money">
						<Stat
							label="Pending deposits"
							value={data.pendingDeposits}
							alert={data.pendingDeposits > 0}
						/>
					</Link>
					<Link to="/money">
						<Stat
							label="Pending withdrawals"
							value={data.pendingWithdrawals}
							alert={data.pendingWithdrawals > 0}
						/>
					</Link>
				</div>
			</section>

			<section className="grid grid-cols-2 gap-3 md:grid-cols-3">
				<Stat label="Total users" value={data.totalUsers} />
				<Stat label="Active users" value={data.activeUsers} />
				<Stat label="Winners today" value={data.todayWinners} />
				<Stat label="Total deposits" value={money(data.totalDeposits)} />
				<Stat label="Total withdrawals" value={money(data.totalWithdrawals)} />
				<Stat label="Current jackpot" value={money(data.currentJackpot)} />
			</section>
		</div>
	);
}
