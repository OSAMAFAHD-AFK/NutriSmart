import { useMemo, useRef, useState } from "react";
import { Camera, Save, ShieldCheck, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_STORAGE, readLoginField } from "@/lib/loginDefaults";
import { assertImageFileSize, fileToDisplayableDataUrl } from "@/lib/patientImages";
import { loadUserProfile, saveUserProfile, saveUsernameForLogin } from "@/lib/userProfile";

export default function SettingsPage() {
  const initial = useMemo(() => loadUserProfile(), []);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(initial.avatarDataUrl);
  const [status, setStatus] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const sizeError = assertImageFileSize(file);
    if (sizeError) {
      setStatus(sizeError);
      return;
    }
    try {
      const next = await fileToDisplayableDataUrl(file, { maxDimension: 480, quality: 0.82 });
      setAvatarDataUrl(next);
      setStatus("Profile photo updated. Press Save Profile.");
    } catch {
      setStatus("Could not read this image.");
    }
  }

  function removeAvatar() {
    setAvatarDataUrl(null);
    setStatus("Profile photo removed. Press Save Profile.");
  }

  function saveProfileInfo() {
    const name = displayName.trim();
    if (!name) {
      setStatus("Name is required.");
      return;
    }
    const next = {
      displayName: name,
      phone: phone.trim(),
      email: email.trim(),
      avatarDataUrl,
    };
    saveUserProfile(next);
    saveUsernameForLogin(name);
    setStatus("Profile information saved.");
  }

  function savePassword() {
    const stored = readLoginField("pass");
    if (currentPassword !== stored) {
      setStatus("Current password is incorrect.");
      return;
    }
    if (newPassword.trim().length < 4) {
      setStatus("New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("Password confirmation does not match.");
      return;
    }
    localStorage.setItem(LOGIN_STORAGE.pass, newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus("Password changed successfully.");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your profile, contacts, and account security.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-foreground">Personal Profile</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt={displayName || "User"} className="h-20 w-20 rounded-full border object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted">
                <UserCircle2 size={44} className="text-muted-foreground" />
              </div>
            )}

            <div className="space-y-2">
              <input
                ref={avatarInputRef}
                id="avatar"
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="hidden"
              />
              <Button type="button" variant="outline" className="gap-2" onClick={() => avatarInputRef.current?.click()}>
                <Camera size={15} />
                Change Photo
              </Button>
              <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={removeAvatar}>
                Remove Photo
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="display-name">Full name</Label>
              <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+967 ..." />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span>Account profile</span>
            <span>Role: <strong className="text-foreground">Nutrition Officer</strong></span>
          </div>

          <Button className="mt-4 gap-2" onClick={saveProfileInfo}>
            <Save size={15} />
            Save Profile
          </Button>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShieldCheck size={16} />
            Security
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Change your password securely.</p>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-4 gap-2" onClick={savePassword}>
            <ShieldCheck size={15} />
            Change Password
          </Button>
        </section>
      </div>

      {status ? (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm">
          {status}
        </div>
      ) : null}
    </div>
  );
}
