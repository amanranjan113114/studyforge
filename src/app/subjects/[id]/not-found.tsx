import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap page">
      <h1>Subject not found</h1>
      <p className="muted">It may have been deleted, or it belongs to another account.</p>
      <Link href="/dashboard" className="btn">
        Back to dashboard
      </Link>
    </main>
  );
}
