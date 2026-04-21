/** Demo login values persisted in localStorage for fast access. */
export const LOGIN_STORAGE = {
  org: "nutrismart_login_org",
  user: "nutrismart_login_user",
  pass: "nutrismart_login_pass",
} as const;

export const LOGIN_DEFAULTS = {
  org: "0000",
  user: "OSAMA",
  pass: "0000",
} as const;

export function readLoginField(
  key: keyof typeof LOGIN_STORAGE,
): string {
  try {
    const value = localStorage.getItem(LOGIN_STORAGE[key]);
    return value ?? LOGIN_DEFAULTS[key];
  } catch {
    return LOGIN_DEFAULTS[key];
  }
}

export function ensureLoginDefaults(): void {
  try {
    if (!localStorage.getItem(LOGIN_STORAGE.org)) {
      localStorage.setItem(LOGIN_STORAGE.org, LOGIN_DEFAULTS.org);
    }
    if (!localStorage.getItem(LOGIN_STORAGE.user)) {
      localStorage.setItem(LOGIN_STORAGE.user, LOGIN_DEFAULTS.user);
    }
    if (!localStorage.getItem(LOGIN_STORAGE.pass)) {
      localStorage.setItem(LOGIN_STORAGE.pass, LOGIN_DEFAULTS.pass);
    }
  } catch {
    /* ignore */
  }
}
