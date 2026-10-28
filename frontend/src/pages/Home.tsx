import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ArrowRight, Zap } from 'lucide-preact';
import { auth } from '../utils/firebase/firebase-init';
import AuthModal from '../components/AuthModal';
import '../css/landing.css';

// Sample data for the "Typical day" preview card (illustrative only).
const SAMPLE_LOAD = [0.9, 0.8, 0.8, 0.8, 0.9, 1.2, 1.9, 2.1, 1.8, 1.6, 1.7, 1.8, 1.7, 1.6, 1.7, 1.9, 2.3, 2.9, 3.3, 3.2, 2.9, 2.2, 1.5, 1.1];
const SAMPLE_SCALE = 4.8;
const SAMPLE_BARS = SAMPLE_LOAD.map((load, h) => ({
  solar: (Math.max(0, Math.sin((Math.PI * (h - 6)) / 12)) * 4.4 * 100) / SAMPLE_SCALE,
  load: (load * 100) / SAMPLE_SCALE,
}));
const SAMPLE_STATS = [
  { label: 'Demand met', value: '99.6%' },
  { label: 'Renewable', value: '84%' },
  { label: 'Payback', value: 'Year 7' },
];

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/guide', label: 'Help' },
];

function Home() {
  const { route } = useLocation();
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  // undefined = closed; otherwise the route to open after signing in (null = stay here).
  const [authRedirect, setAuthRedirect] = useState<string | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Signed in → go straight to the toolkit; otherwise sign in first, then continue there.
  const openToolkit = () => (user ? route('/projects') : setAuthRedirect('/projects'));

  // Client-side navigation for plain left-clicks; keep modifier-clicks (new tab etc.) native.
  const nav = (e: MouseEvent, to: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    route(to);
  };

  return (
    <>
      <div class="mg-root mg-landing">
        <div class="mg-landing__photo" aria-hidden="true" />
        <div class="mg-landing__shade" aria-hidden="true" />

        <header class="mg-landing__nav">
          <a href="/" class="mg-landing__brand" onClick={(e) => nav(e, '/')}>
            <span class="mg-landing__mark">
              <Zap size={17} strokeWidth={2} fill="currentColor" />
            </span>
            <span>Microgrid Toolkit</span>
          </a>
          <nav class="mg-landing__links" aria-label="Site">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} class="mg-landing__link" onClick={(e) => nav(e, l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div class="mg-landing__spacer" />
          {user ? (
            <a href="/account" class="mg-landing__link mg-landing__link--strong" onClick={(e) => nav(e, '/account')}>
              Account
            </a>
          ) : (
            <button type="button" class="mg-landing__link mg-landing__link--strong" onClick={() => setAuthRedirect(null)}>
              Sign in
            </button>
          )}
          <button type="button" class="mg-landing__glass" onClick={openToolkit}>
            Open Toolkit
          </button>
        </header>

        <main class="mg-landing__main">
          <div class="mg-landing__hero">
            <div class="mg-landing__pill mg-landing__rise" style={{ animationDelay: '200ms', animationDuration: '700ms' }}>
              <span class="mg-landing__pill-dot" />
              Courtesy of Kilowatts for Humanity
            </div>
            <h1 class="mg-landing__title mg-landing__rise" style={{ animationDelay: '300ms' }}>
              Welcome to the
              <br />
              SESDC Microgrid Toolkit
            </h1>
            <p class="mg-landing__sub mg-landing__rise" style={{ animationDelay: '420ms' }}>
              Design, simulate, and plan your microgrid with ease.
            </p>
            <div class="mg-landing__cta-row mg-landing__rise" style={{ animationDelay: '540ms' }}>
              <button type="button" class="mg-landing__cta" onClick={openToolkit}>
                Get Started
                <ArrowRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div class="mg-landing__preview mg-landing__rise" style={{ animationDelay: '650ms', animationDuration: '900ms' }}>
            <div class="mg-landing__preview-head">
              <div class="mg-landing__preview-title">
                <span class="mg-caption">Typical day</span>
                <span>Solar vs. demand</span>
              </div>
              <div class="mg-landing__legend">
                <span>
                  <i style={{ background: 'var(--mg-solar)' }} />
                  Solar
                </span>
                <span>
                  <i style={{ background: 'var(--mg-ink)' }} />
                  Demand
                </span>
              </div>
            </div>
            <div class="mg-landing__chart" role="img" aria-label="Sample typical day: solar output peaks at midday while demand peaks in the evening">
              {SAMPLE_BARS.map((b, h) => (
                <div key={h} class="mg-landing__col">
                  <div class="mg-landing__bar" style={{ height: `${b.solar}%` }} />
                  <div class="mg-landing__dot" style={{ bottom: `${b.load}%` }} />
                </div>
              ))}
            </div>
            <div class="mg-landing__axis">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
            <div class="mg-landing__stats">
              {SAMPLE_STATS.map((s) => (
                <div key={s.label} class="mg-landing__stat">
                  <div class="mg-landing__stat-label">{s.label}</div>
                  <div class="mg-landing__stat-value mg-tnum">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer class="mg-landing__footer">
          <span class="mg-landing__spacer" />
          <a href="https://github.com/pdauenhauer/SESDC-toolkit" target="_blank" rel="noopener noreferrer" class="mg-landing__footer-link">
            GitHub
          </a>
        </footer>
      </div>

      {/* Legacy-styled modal: kept outside .mg-root so the redesign's type/link rules don't touch it. */}
      {authRedirect !== undefined && !user ? (
        <AuthModal onClose={() => setAuthRedirect(undefined)} afterLoginRedirect={authRedirect} />
      ) : null}
    </>
  );
}

export default Home;
