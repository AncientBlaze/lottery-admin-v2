import {
	createRootRoute,
	createRoute,
	createRouter,
	Navigate,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import AdminLayout from "./components/AdminLayout";
import { useAuth } from "./lib/auth";
import BannersPage from "./pages/Banners";
import DashboardPage from "./pages/Dashboard";
import DrawsPage from "./pages/Draws";
import LoginPage from "./pages/Login";
import MoneyPage from "./pages/Money";
import SettingsPage from "./pages/Settings";
import UsersPage from "./pages/Users";

const rootRoute = createRootRoute({
	component: () => <Outlet />,
	notFoundComponent: () => <Navigate to="/" replace />,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	beforeLoad: () => {
		if (useAuth.getState().token) throw redirect({ to: "/" });
	},
	component: LoginPage,
});

// Layout route: every page under it requires a token.
const adminRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "admin",
	beforeLoad: () => {
		if (!useAuth.getState().token) throw redirect({ to: "/login" });
	},
	component: AdminLayout,
});

const dashboardRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/",
	component: DashboardPage,
});
const drawsRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/draws",
	component: DrawsPage,
});
const moneyRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/money",
	component: MoneyPage,
});

// Page number lives in the URL (?page=2) so refresh / back button keep your place.
const usersRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/users",
	validateSearch: (s: Record<string, unknown>): { page?: number } => {
		const n = Number(s.page);
		return Number.isInteger(n) && n > 1 ? { page: n } : {};
	},
	component: UsersPage,
});

const bannersRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/banners",
	component: BannersPage,
});
const settingsRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/settings",
	component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
	loginRoute,
	adminRoute.addChildren([
		dashboardRoute,
		drawsRoute,
		moneyRoute,
		usersRoute,
		bannersRoute,
		settingsRoute,
	]),
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
