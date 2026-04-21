import { LOGIN_STORAGE, readLoginField } from "@/lib/loginDefaults";

const USER_PROFILE_STORAGE_KEY = "nutrismart_user_profile_v1";
export const USER_PROFILE_CHANGED_EVENT = "nutrismart-user-profile-updated";

export type UserProfile = {
  displayName: string;
  phone: string;
  email: string;
  avatarDataUrl: string | null;
};

export function loadUserProfile(): UserProfile {
  const fallbackName = readLoginField("user").trim() || "User";
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return { displayName: fallbackName, phone: "", email: "", avatarDataUrl: null };
    }
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      displayName: typeof parsed.displayName === "string" && parsed.displayName.trim() ? parsed.displayName : fallbackName,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      avatarDataUrl: typeof parsed.avatarDataUrl === "string" && parsed.avatarDataUrl.trim() ? parsed.avatarDataUrl : null,
    };
  } catch {
    return { displayName: fallbackName, phone: "", email: "", avatarDataUrl: null };
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_PROFILE_CHANGED_EVENT));
  }
}

export function saveUsernameForLogin(name: string): void {
  localStorage.setItem(LOGIN_STORAGE.user, name);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_PROFILE_CHANGED_EVENT));
  }
}
