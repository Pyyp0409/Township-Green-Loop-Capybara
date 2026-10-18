import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Section } from "@/components/ui";
import { SignOutButton } from "@/app/sign-out-button";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Profile</h1>

      <Section title="Your details">
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          township={profile?.township ?? ""}
        />
      </Section>

      <Section title="Account">
        <Card>
          <p className="text-sm text-slate-600">{user?.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            {profile?.membership === "supporter"
              ? `Supporter${profile?.home_city ? ` from ${profile.home_city}` : ""} — you fund this township from elsewhere, so activity check-ins stay with residents.`
              : "Resident — you can join activities for points and spend at your malls."}
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </Card>
      </Section>
    </main>
  );
}
