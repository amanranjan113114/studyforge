import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="header">
      <div className="wrap">
        <Link href={user ? "/dashboard" : "/"} className="logo">
          Study<span>Forge</span>
        </Link>
        <nav className="nav">
          {user ? (
            <>
              <span className="muted small">{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn small">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
