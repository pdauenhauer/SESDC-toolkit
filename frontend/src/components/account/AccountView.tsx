import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { ArrowLeft, Bell, CircleHelp, KeyRound, LogOut, Mail, Trash2, User, Zap } from "lucide-preact";
import { Button, IconButton, Switch, TextField } from "../ui";
import { STROKE } from "../ui/icons";
import { initialsOf } from "../workbench/model";
import "../../css/app-shell.css";
import "../../css/account-v2.css";

export type AccountProfile = { displayName: string | null; email: string | null };

type AccountViewProps = {
  /** null while loading; the page shows a loading / signed-out state instead. */
  profile: AccountProfile | null;
  projectCount: number | null;
  emailUpdates: boolean;
  onToggleEmail: (next: boolean) => void;
  /** Resolve true on success (the form closes), false to keep it open. */
  onUpdatePassword: (password: string) => Promise<boolean>;
  onDeleteAccount: (password: string) => Promise<boolean>;
  onSignOut: () => void;
  onBack: () => void;
  onHelp: () => void;
  /** Replaces the page body (loading / signed-out). */
  state?: ComponentChildren;
};

const MIN_PASSWORD = 6;

function Row({ icon, label, children, action }: { icon: ComponentChildren; label: string; children: ComponentChildren; action?: ComponentChildren }) {
  return (
    <div class={`mg-acct-row${action ? " has-action" : ""}`}>
      <span class="mg-acct-tile">{icon}</span>
      <span class="mg-acct-row__text">
        <span class="mg-caption">{label}</span>
        <span class="mg-acct-row__value">{children}</span>
      </span>
      {action}
    </div>
  );
}

export function AccountView(p: AccountViewProps) {
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const name = p.profile?.displayName || p.profile?.email?.split("@")[0] || "Account";
  const email = p.profile?.email ?? "—";
  const initials = initialsOf(p.profile?.displayName || p.profile?.email);

  const short = pw1.length > 0 && pw1.length < MIN_PASSWORD;
  const mismatch = pw2.length > 0 && pw1 !== pw2;
  const pwInvalid = pw1.length < MIN_PASSWORD || pw1 !== pw2;
  const pwHint = short
    ? `Use at least ${MIN_PASSWORD} characters`
    : mismatch
      ? "Passwords don't match"
      : pw1 && !pwInvalid
        ? "Passwords match"
        : `At least ${MIN_PASSWORD} characters`;
  const pwHintTone = short || mismatch ? "is-error" : pw1 && !pwInvalid ? "is-ok" : "";

  const togglePw = () => {
    setPwOpen((o) => !o);
    setPw1("");
    setPw2("");
    setDelOpen(false);
  };
  const toggleDel = () => {
    setDelOpen((o) => !o);
    setDelPw("");
    setPwOpen(false);
  };

  const savePw = async () => {
    if (pwInvalid || pwBusy) return;
    setPwBusy(true);
    const ok = await p.onUpdatePassword(pw1);
    setPwBusy(false);
    if (ok) {
      setPwOpen(false);
      setPw1("");
      setPw2("");
    }
  };

  const confirmDelete = async () => {
    if (!delPw || delBusy) return;
    setDelBusy(true);
    const ok = await p.onDeleteAccount(delPw);
    // On success the page navigates away; keep the button disabled until then.
    if (!ok) {
      setDelBusy(false);
      setDelPw("");
    }
  };

  return (
    <div class="mg-root mg-acct">
      <header class="mg-header mg-acct__header">
        <a href="/" class="mg-brand" aria-label="Microgrid Toolkit home" title="Home">
          <Zap size={16} strokeWidth={STROKE} fill="currentColor" />
        </a>
        <a href="/projects" class="mg-acct__crumb">
          Microgrid Toolkit
        </a>
        <span class="mg-crumbs__sep">/</span>
        <span class="mg-acct__crumb-current">Account</span>
        <div class="mg-header__spacer" />
        <Button variant="secondary" size="sm" class="mg-acct__back" icon={<ArrowLeft size={16} strokeWidth={STROKE} />} onClick={p.onBack}>
          Back to projects
        </Button>
        <IconButton label="Help" size="round" onClick={p.onHelp}>
          <CircleHelp size={18} strokeWidth={STROKE} />
        </IconButton>
        <div class="mg-avatar mg-avatar--solid" aria-hidden="true">
          {initials}
        </div>
      </header>

      <main class="mg-acct__main">
        <div class="mg-acct__col">
          <div class="mg-acct__title">
            <h1>Account</h1>
            <p class="mg-muted">Manage your account and preferences</p>
          </div>

          {p.state ?? (
            <>
              <section class="mg-card mg-acct-card">
                <div class="mg-acct-profile">
                  <div class="mg-acct-profile__avatar">{initials}</div>
                  <div class="mg-acct-profile__who">
                    <span class="mg-acct-profile__name">{name}</span>
                    <span class="mg-acct-profile__email mg-muted">{email}</span>
                  </div>
                  <a href="/projects" class="mg-acct-stat" title="Go to projects">
                    <span class="mg-acct-stat__value mg-tnum">{p.projectCount ?? "—"}</span>
                    <span class="mg-caption">{p.projectCount === 1 ? "project owned" : "projects owned"}</span>
                  </a>
                </div>

                <div class="mg-acct-rows">
                  <Row icon={<User size={16} strokeWidth={STROKE} />} label="Username">
                    {p.profile?.displayName || "—"}
                  </Row>
                  <Row icon={<Mail size={16} strokeWidth={STROKE} />} label="Email">
                    <span class="mg-acct-ellipsis">{email}</span>
                  </Row>
                  <div class="mg-acct-pw">
                    <Row
                      icon={<KeyRound size={16} strokeWidth={STROKE} />}
                      label="Password"
                      action={
                        <Button variant="secondary" size="sm" aria-expanded={pwOpen} onClick={togglePw}>
                          {pwOpen ? "Close" : "Change"}
                        </Button>
                      }
                    >
                      <span class="mg-acct-dots">••••••••••</span>
                    </Row>
                    {pwOpen && (
                      <div class="mg-acct-expand mg-acct-expand--indent">
                        <div class="mg-acct-pw__fields">
                          <TextField label="New password" type="password" autoComplete="new-password" value={pw1} onValue={setPw1} />
                          <TextField label="Confirm new password" type="password" autoComplete="new-password" value={pw2} onValue={setPw2} />
                        </div>
                        <div class="mg-acct-pw__actions">
                          <span class={`mg-acct-hint ${pwHintTone}`} aria-live="polite">
                            {pwHint}
                          </span>
                          <Button variant="quiet" onClick={togglePw}>
                            Cancel
                          </Button>
                          <Button variant="primary" disabled={pwInvalid || pwBusy} onClick={savePw}>
                            {pwBusy ? "Updating…" : "Update password"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section class="mg-card mg-acct-card">
                <div class="mg-acct-card__head">
                  <h2 class="mg-h3">Preferences</h2>
                </div>
                <div class="mg-acct-row has-action mg-acct-pref" onClick={() => p.onToggleEmail(!p.emailUpdates)}>
                  <span class="mg-acct-tile">
                    <Bell size={16} strokeWidth={STROKE} />
                  </span>
                  <span class="mg-acct-row__text">
                    <span class="mg-acct-row__value">Email updates</span>
                    <span class="mg-caption">
                      {p.emailUpdates ? "You’ll receive product news and release notes" : "You won’t receive product emails"}
                    </span>
                  </span>
                  <Switch checked={p.emailUpdates} onChange={p.onToggleEmail} label="Email updates" />
                </div>
              </section>

              <section class="mg-card mg-acct-card mg-acct-line">
                <span class="mg-acct-line__text">
                  <span class="mg-acct-row__value">Sign out</span>
                  <span class="mg-caption">End your session on this device</span>
                </span>
                <Button variant="secondary" icon={<LogOut size={16} strokeWidth={STROKE} />} onClick={p.onSignOut}>
                  Sign out
                </Button>
              </section>

              <section class="mg-acct-danger">
                <div class="mg-acct-line">
                  <span class="mg-acct-line__text">
                    <span class="mg-acct-row__value mg-acct-danger__title">Delete account</span>
                    <span class="mg-caption">Permanently removes your account and all of its projects</span>
                  </span>
                  <Button variant="danger-outline" aria-expanded={delOpen} icon={<Trash2 size={16} strokeWidth={STROKE} />} onClick={toggleDel}>
                    {delOpen ? "Hide" : "Delete account"}
                  </Button>
                </div>
                {delOpen && (
                  <div class="mg-acct-expand">
                    <div class="mg-acct-warn">This action cannot be undone.</div>
                    <div class="mg-acct-danger__field">
                      <TextField
                        label="Enter your password to confirm"
                        type="password"
                        autoComplete="current-password"
                        value={delPw}
                        onValue={setDelPw}
                      />
                    </div>
                    <div class="mg-acct-danger__actions">
                      <Button variant="danger" disabled={!delPw || delBusy} onClick={confirmDelete}>
                        {delBusy ? "Deleting…" : "Delete my account"}
                      </Button>
                      <Button variant="quiet" onClick={toggleDel} disabled={delBusy}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
