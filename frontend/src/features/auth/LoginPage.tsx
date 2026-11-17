import { useState, type FormEvent } from "react";
import "../../styles/login.css";

type LoginPageProps = {
  /** Branche ici ta logique d'auth existante. Lance une Error pour afficher un message. */
  onLogin: (email: string, password: string, remember: boolean) => Promise<void>;
  onForgotPassword?: () => void;
  onBackToSite?: () => void;
};

const Icon = {
  mail: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 8 9 6 9-6" /></svg>
  ),
  lock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  eyeOff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
  ),
  wrench: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2.8 2.8 0 0 1-4-4l8.7-9.7Z" /><path d="M14.7 6.3a4 4 0 0 1 5-3.3l-2.4 2.4.6 1.7 1.7.6L22 5.3a4 4 0 0 1-7.3 1Z" /></svg>
  ),
};

export default function LoginPage({ onLogin, onForgotPassword, onBackToSite }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await onLogin(email.trim(), password, remember);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible. Vérifiez vos identifiants.");
      setShakeKey((k) => k + 1); // relance l'animation de secousse
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      {/* ===== Panneau gauche ===== */}
      <section className="login__hero" aria-hidden={false}>
        <svg className="login__circuit" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M-20 160 H180 L240 220 H460 L520 160 H820" />
          <path d="M-20 520 H120 L200 440 H380 L440 500 H620 L700 420 H820" />
          <path d="M-20 780 H260 L320 720 H560 L620 780 H820" />
          <circle cx="180" cy="160" r="4" />
          <circle cx="460" cy="220" r="4" />
          <circle cx="200" cy="440" r="4" />
          <circle cx="620" cy="500" r="4" />
          <circle cx="320" cy="720" r="4" />
          <circle cx="620" cy="780" r="4" />
        </svg>

        <div className="login__brand">
          <span className="login__logo">{Icon.wrench}</span>
          Location Matériel
        </div>

        <div className="login__headline">
          <h1>
            Gérez votre matériel <span className="accent">en toute simplicité</span>
          </h1>
          <p>
            Réservations, stocks et retours au même endroit. Connectez-vous pour suivre vos
            locations en temps réel.
          </p>
        </div>

        <div className="login__stats">
          <div className="login__stat"><strong>500+</strong><span>Équipements</span></div>
          <div className="login__stat"><strong>1&nbsp;200</strong><span>Locations</span></div>
          <div className="login__stat"><strong>24/7</strong><span>Suivi en ligne</span></div>
        </div>
      </section>

      {/* ===== Panneau formulaire ===== */}
      <section className="login__panel">
        <form
          key={shakeKey}
          className={`login__card${error ? " is-error" : ""}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <h2 className="login__title">Connexion</h2>
          <p className="login__sub">Entrez vos identifiants pour accéder à votre espace.</p>

          {error && (
            <div className="login__error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16.5v.01" /></svg>
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <div className="field__box">
              <span className="field__icon">{Icon.mail}</span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <div className="field__box">
              <span className="field__icon">{Icon.lock}</span>
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPwd ? Icon.eyeOff : Icon.eye}
              </button>
            </div>
          </div>

          <div className="login__row">
            <label className="login__check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Rester connecté
            </label>
            <a
              href="#"
              className="login__link"
              onClick={(e) => { e.preventDefault(); onForgotPassword?.(); }}
            >
              Mot de passe oublié ?
            </a>
          </div>

          <button className="btn-primary" type="submit" disabled={loading || !email || !password}>
            {loading ? (<><span className="spinner" /> Connexion…</>) : "Se connecter"}
          </button>

          {onBackToSite && (
            <p className="login__foot">
              <a href="#" className="login__link" onClick={(e) => { e.preventDefault(); onBackToSite(); }}>
                Retour au site
              </a>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}