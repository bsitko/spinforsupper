import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin";
import AdminApp from "./AdminApp";

export const metadata: Metadata = { title: "Admin · Spin for Supper", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return <AdminApp loggedIn={await isAdmin()} configured={!!process.env.ADMIN_PASSWORD} />;
}
