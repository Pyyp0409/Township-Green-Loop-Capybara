import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300"
      >
        Sign out
      </button>
    </form>
  );
}
