import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, inputCls } from "../components/ui";
import { api, toList } from "../lib/api";

type Banner = {
	id: string;
	title?: string;
	imageUrl?: string;
	linkType?: string;
	linkValue?: string | null;
	sortOrder?: number;
	isActive?: boolean;
};

type Draw = {
	id: string;
	drawNumber?: number | string;
	drawType?: string;
	status?: string;
	ticketPrice?: string | number;
};

const emptyForm = {
	title: "",
	imageUrl: "",
	linkType: "NONE",
	linkValue: "",
	sortOrder: "0",
	isActive: true,
};
type Form = typeof emptyForm;

function drawLabel(d: Draw) {
	const num = d.drawNumber ?? d.id?.slice(0, 8);
	const price = d.ticketPrice != null ? `₹${d.ticketPrice}` : "";
	return `#${num} · ${d.drawType || "DAILY"} · ${d.status || "?"}${price ? ` · ${price}` : ""}`;
}

export default function BannersPage() {
	const qc = useQueryClient();
	const [form, setForm] = useState<Form>(emptyForm);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [uploading, setUploading] = useState(false);

	const banners = useQuery({
		queryKey: ["banners"],
		queryFn: async () =>
			toList(
				(await api<Banner[] | { items: Banner[] }>("/admin/banners")).data,
			),
	});

	// A failure loading draws must not block the banner list (same as the old panel).
	const drawsQ = useQuery({
		queryKey: ["draws", "banner-picker"],
		queryFn: async () => {
			try {
				return toList(
					(await api<Draw[] | { items: Draw[] }>("/admin/draws")).data,
				);
			} catch {
				return [] as Draw[];
			}
		},
	});

	const list = banners.data ?? [];
	const draws = drawsQ.data ?? [];
	const openDraws = useMemo(
		() =>
			draws.filter((d) =>
				["OPEN", "SCHEDULED"].includes((d.status || "").toUpperCase()),
			),
		[draws],
	);

	const setField = <K extends keyof Form>(k: K, v: Form[K]) =>
		setForm((f) => ({ ...f, [k]: v }));

	function closeForm() {
		setShowForm(false);
		setEditingId(null);
		setForm(emptyForm);
	}

	function onLinkTypeChange(type: string) {
		setForm((f) => ({
			...f,
			linkType: type,
			linkValue:
				type === "DRAW" ? f.linkValue : type === f.linkType ? f.linkValue : "",
		}));
	}

	function onPickDraw(drawId: string) {
		const d = draws.find((x) => x.id === drawId);
		setForm((f) => ({
			...f,
			linkType: "DRAW",
			linkValue: drawId,
			title: f.title?.trim()
				? f.title
				: d
					? `Draw #${d.drawNumber ?? d.id?.slice(0, 6)}`
					: f.title,
		}));
	}

	async function onUpload(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const fd = new FormData();
			fd.append("file", file);
			const res = await api<{ url?: string }>("/admin/banners/upload", {
				method: "POST",
				body: fd,
			});
			const url = res.data?.url;
			if (!url) throw new Error("No URL returned");
			setField("imageUrl", url);
			toast.success("Image uploaded");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setUploading(false);
			e.target.value = "";
		}
	}

	const refresh = () => {
		void qc.invalidateQueries({ queryKey: ["banners"] });
		void qc.invalidateQueries({ queryKey: ["draws"] });
	};

	const save = useMutation({
		mutationFn: (v: { id: string | null; payload: object }) =>
			v.id
				? api(`/admin/banners/${v.id}`, {
						method: "PUT",
						body: JSON.stringify(v.payload),
					})
				: api("/admin/banners", {
						method: "POST",
						body: JSON.stringify(v.payload),
					}),
		onSuccess: (_r, v) => {
			toast.success(v.id ? "Banner updated" : "Banner created");
			closeForm();
			void qc.invalidateQueries({ queryKey: ["banners"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const toggle = useMutation({
		mutationFn: (b: Banner) =>
			api(`/admin/banners/${b.id}`, {
				method: "PUT",
				body: JSON.stringify({ isActive: !b.isActive }),
			}),
		onSuccess: () => void qc.invalidateQueries({ queryKey: ["banners"] }),
		onError: (e: Error) => toast.error(e.message),
	});

	const remove = useMutation({
		mutationFn: (id: string) =>
			api(`/admin/banners/${id}`, { method: "DELETE" }),
		onSuccess: () => {
			toast.success("Deleted");
			void qc.invalidateQueries({ queryKey: ["banners"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	function onSubmit(e: FormEvent) {
		e.preventDefault();
		if (form.linkType === "DRAW" && !form.linkValue) {
			toast.error("Pick a draw for DRAW link type");
			return;
		}
		save.mutate({
			id: editingId,
			payload: {
				title: form.title,
				imageUrl: form.imageUrl,
				linkType: form.linkType,
				linkValue: form.linkValue || null,
				sortOrder: Number(form.sortOrder) || 0,
				isActive: form.isActive,
			},
		});
	}

	function edit(b: Banner) {
		setEditingId(b.id);
		setForm({
			title: b.title || "",
			imageUrl: b.imageUrl || "",
			linkType: b.linkType || "NONE",
			linkValue: b.linkValue || "",
			sortOrder: String(b.sortOrder ?? 0),
			isActive: b.isActive !== false,
		});
		setShowForm(true);
	}

	function resolveDrawLabel(id?: string | null) {
		if (!id) return null;
		const d = draws.find((x) => x.id === id);
		return d ? drawLabel(d) : id;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
						Marketing
					</p>
					<h1 className="mt-1 text-2xl font-bold text-white">Banners</h1>
					<p className="mt-1 text-sm text-slate-400">
						Upload an image, pick a draw — it shows on the app home carousel.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={refresh}
						className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10"
					>
						Refresh
					</button>
					<button
						type="button"
						onClick={() => {
							setEditingId(null);
							setForm(emptyForm);
							setShowForm((s) => !s);
						}}
						className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20"
					>
						{showForm ? "Close" : "+ New banner"}
					</button>
				</div>
			</div>

			{openDraws.length > 0 && (
				<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100/90">
					<span className="font-semibold text-emerald-300">
						{openDraws.length}
					</span>{" "}
					open/scheduled draw
					{openDraws.length > 1 ? "s" : ""} ready to link.
					{!showForm && (
						<button
							type="button"
							className="ml-2 text-amber-300 underline underline-offset-2"
							onClick={() => {
								setShowForm(true);
								onPickDraw(openDraws[0].id);
							}}
						>
							Banner for latest
						</button>
					)}
				</div>
			)}

			{showForm && (
				<form
					onSubmit={onSubmit}
					className="relative max-w-2xl space-y-4 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#121a2b] to-[#0d1422] p-6"
				>
					<div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
					<h2 className="text-sm font-semibold text-amber-300">
						{editingId ? "Edit banner" : "Create banner"}
					</h2>

					<Field asLabel label="Title">
						<input
							required
							className={inputCls}
							placeholder="e.g. Tonight's mega draw"
							value={form.title}
							onChange={(e) => setField("title", e.target.value)}
						/>
					</Field>

					<Field label="Image" hint="Upload or paste a full image URL">
						<div className="flex flex-wrap items-center gap-3">
							<label className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
								{uploading ? "Uploading…" : "Choose file"}
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={onUpload}
									disabled={uploading}
								/>
							</label>
							<input
								required
								className={`${inputCls} min-w-[200px] flex-1`}
								placeholder="https://…"
								value={form.imageUrl}
								onChange={(e) => setField("imageUrl", e.target.value)}
							/>
						</div>
						{form.imageUrl && (
							<img
								src={form.imageUrl}
								alt="preview"
								className="mt-2 max-h-40 rounded-xl border border-white/10 object-cover"
							/>
						)}
					</Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field asLabel label="Link type">
							<select
								className={inputCls}
								value={form.linkType}
								onChange={(e) => onLinkTypeChange(e.target.value)}
							>
								<option value="NONE">None (image only)</option>
								<option value="DRAW">Draw (open in app)</option>
								<option value="SCREEN">App screen</option>
								<option value="URL">External URL</option>
							</select>
						</Field>

						{form.linkType === "DRAW" && (
							<Field asLabel label="Draw" hint="From admin draws list">
								<select
									className={inputCls}
									value={form.linkValue}
									onChange={(e) => onPickDraw(e.target.value)}
									required
								>
									<option value="">Select a draw…</option>
									{openDraws.length > 0 && (
										<optgroup label="Open / scheduled">
											{openDraws.map((d) => (
												<option key={d.id} value={d.id}>
													{drawLabel(d)}
												</option>
											))}
										</optgroup>
									)}
									<optgroup label="All draws">
										{draws.map((d) => (
											<option key={`all-${d.id}`} value={d.id}>
												{drawLabel(d)}
											</option>
										))}
									</optgroup>
								</select>
							</Field>
						)}

						{form.linkType === "SCREEN" && (
							<Field asLabel label="Screen">
								<select
									className={inputCls}
									value={form.linkValue}
									onChange={(e) => setField("linkValue", e.target.value)}
								>
									<option value="">Select…</option>
									<option value="wallet">Wallet</option>
									<option value="referral">Referral / Share</option>
									<option value="spin">Lucky spin</option>
									<option value="tickets">My tickets</option>
								</select>
							</Field>
						)}

						{form.linkType === "URL" && (
							<Field asLabel label="URL">
								<input
									className={inputCls}
									placeholder="https://…"
									value={form.linkValue}
									onChange={(e) => setField("linkValue", e.target.value)}
								/>
							</Field>
						)}

						<Field asLabel label="Sort order">
							<input
								type="number"
								className={inputCls}
								value={form.sortOrder}
								onChange={(e) => setField("sortOrder", e.target.value)}
							/>
						</Field>

						<Field label="Status">
							<label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-slate-200">
								<input
									type="checkbox"
									checked={form.isActive}
									onChange={(e) => setField("isActive", e.target.checked)}
								/>
								Active on app home
							</label>
						</Field>
					</div>

					<div className="flex flex-wrap gap-3 pt-2">
						<button
							type="submit"
							disabled={save.isPending || uploading}
							className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
						>
							{save.isPending
								? "Saving…"
								: editingId
									? "Update banner"
									: "Create banner"}
						</button>
						<button
							type="button"
							onClick={closeForm}
							className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{banners.isError ? (
				<div className="text-red-400">{(banners.error as Error).message}</div>
			) : banners.isLoading ? (
				<div className="grid gap-3 sm:grid-cols-2">
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-28 animate-pulse rounded-2xl bg-white/5"
						/>
					))}
				</div>
			) : list.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
					<p className="font-medium text-slate-200">No banners yet</p>
					<p className="mt-1 text-sm text-slate-500">
						Create a draw first, then link a banner to it.
					</p>
				</div>
			) : (
				<div className="grid gap-3 lg:grid-cols-2">
					{list.map((b) => (
						<article
							key={b.id}
							className="flex gap-4 rounded-2xl border border-white/10 bg-[#0f172a] p-4 hover:border-amber-500/25"
						>
							<img
								src={b.imageUrl}
								alt={b.title}
								className="h-20 w-32 shrink-0 rounded-xl border border-white/10 bg-black/40 object-cover"
							/>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="truncate font-semibold text-amber-200">
										{b.title}
									</h3>
									<span
										className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
											b.isActive
												? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
												: "border-slate-500/30 bg-slate-500/10 text-slate-400"
										}`}
									>
										{b.isActive ? "Active" : "Off"}
									</span>
								</div>
								<p className="mt-1 text-xs text-slate-400">
									{b.linkType}
									{b.linkType === "DRAW" && b.linkValue
										? ` → ${resolveDrawLabel(b.linkValue)}`
										: b.linkValue
											? ` · ${b.linkValue}`
											: ""}
									{" · "}order {b.sortOrder}
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<button
										type="button"
										disabled={toggle.isPending && toggle.variables?.id === b.id}
										onClick={() => toggle.mutate(b)}
										className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-50"
									>
										{b.isActive ? "Disable" : "Enable"}
									</button>
									<button
										type="button"
										onClick={() => edit(b)}
										className="px-2 py-1 text-xs text-amber-400"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => {
											if (window.confirm("Delete this banner?"))
												remove.mutate(b.id);
										}}
										className="px-2 py-1 text-xs text-red-400"
									>
										Delete
									</button>
								</div>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
