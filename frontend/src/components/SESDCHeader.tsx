import logo from '../media/Logo.svg'
import accountDefaultIcon from '../media/circle-user-4.svg'
import accountHoverIcon from '../media/circle-user-3.svg'
import menuIcon from '../media/menu-2.svg'
import AuthModal from './AuthModal'
import { useState, useEffect } from 'preact/hooks'
import { useLocation } from 'preact-iso'

import { auth } from '../utils/firebase/firebase-init';
import { onAuthStateChanged, User } from 'firebase/auth';

function SESDCHeader() {
    const [user, setUser] = useState<User | null>(() => auth.currentUser);
    const [hasScrolled, setHasScrolled] = useState<boolean>(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
    const [authRedirectTarget, setAuthRedirectTarget] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const { route, path } = useLocation();
    const isActive = (path: string): string =>
        window.location.pathname === path ? 'active' : '';

    const handleNavClick = (event: MouseEvent, to: string) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        event.preventDefault();
        if (window.location.pathname === to) return;
        route(to);
    };

    const handleMobileNavClick = (event: MouseEvent, to: string) => {
        setMobileMenuOpen(false);
        handleNavClick(event, to);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setHasScrolled(window.scrollY > 0);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [path]);

    return (
        <nav class={hasScrolled ? 'nav-scrolled' : ''}>
            <div class="nav-left">
                <a
                    class="nav-brand"
                    href="/"
                    aria-label="Go to Home"
                    onClick={(event) => handleNavClick(event as MouseEvent, '/')}
                >
                    <img src={logo} alt="SESDC logo" class="nav-logo" />
                    <span class="logo-nav">Microgrid Toolkit</span>
                </a>

                <div class="nav-links nav-links-left">
                    <li>
                        <a
                            className={`${isActive('/about')} nav-home-link`.trim()}
                            href="/about"
                            aria-label="About"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/about')}
                        >
                            <span>About</span>
                        </a>
                    </li>
                    <li>
                        <a
                            className={`${isActive('/contact')} nav-home-link nav-contact-link-tight`.trim()}
                            href="/contact"
                            aria-label="Contact"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/contact')}
                        >
                            <span>Contact</span>
                        </a>
                    </li>
                    <li>
                        <a
                            className={`${isActive('/guide')} nav-home-link`.trim()}
                            href="/guide"
                            aria-label="Help"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/guide')}
                        >
                            <span>Help</span>
                        </a>
                    </li>
                </div>
            </div>

            <div class="nav-links nav-links-right">
                {!user && (
                    <li>
                        <button
                            type="button"
                            class="nav-home-link nav-signin-btn"
                            onClick={() => {
                                setAuthRedirectTarget(null);
                                setIsAuthModalOpen(true);
                            }}
                        >
                            Sign in
                        </button>
                    </li>
                )}
                {user && (
                    <li>
                        <a
                            className={`${isActive('/account')} nav-home-link`.trim()}
                            href="/account"
                            aria-label="Account"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/account')}
                        >
                            <img src={accountDefaultIcon} alt="" class="nav-account-icon nav-account-icon--default" />
                            <img src={accountHoverIcon} alt="" class="nav-account-icon nav-account-icon--hover" />
                        </a>
                    </li>
                )}
                <li>
                    {user ? (
                        <a
                            className={`${isActive('/projects')} nav-home-link`.trim()}
                            href="/projects"
                            aria-label="Open toolkit"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/projects')}
                        >
                            <span>Open Toolkit</span>
                        </a>
                    ) : (
                        <button
                            type="button"
                            class="nav-home-link nav-open-toolkit-btn"
                            aria-label="Open toolkit"
                            onClick={() => {
                                setAuthRedirectTarget('/projects');
                                setIsAuthModalOpen(true);
                            }}
                        >
                            <span>Open Toolkit</span>
                        </button>
                    )}
                </li>
                <li>
                    <button
                        type="button"
                        class="nav-hamburger-btn"
                        aria-label="Toggle navigation menu"
                        aria-expanded={mobileMenuOpen}
                        aria-controls="nav-mobile-menu"
                        onClick={() => setMobileMenuOpen((open) => !open)}
                    >
                        <img src={menuIcon} alt="" class="nav-hamburger-icon" />
                    </button>
                </li>
            </div>
            <button
                type="button"
                class={`nav-mobile-backdrop${mobileMenuOpen ? ' is-open' : ''}`}
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
            />
            <aside
                id="nav-mobile-menu"
                class={`nav-mobile-menu${mobileMenuOpen ? ' is-open' : ''}`}
                aria-hidden={!mobileMenuOpen}
            >
                <a
                    className={`${isActive('/about')} nav-home-link`.trim()}
                    href="/about"
                    aria-label="About"
                    onClick={(event) => handleMobileNavClick(event as MouseEvent, '/about')}
                >
                    <span>About</span>
                </a>
                <a
                    className={`${isActive('/contact')} nav-home-link`.trim()}
                    href="/contact"
                    aria-label="Contact"
                    onClick={(event) => handleMobileNavClick(event as MouseEvent, '/contact')}
                >
                    <span>Contact</span>
                </a>
                <a
                    className={`${isActive('/guide')} nav-home-link`.trim()}
                    href="/guide"
                    aria-label="Help"
                    onClick={(event) => handleMobileNavClick(event as MouseEvent, '/guide')}
                >
                    <span>Help</span>
                </a>
            </aside>
            {isAuthModalOpen && !user ? (
                <AuthModal
                    onClose={() => {
                        setIsAuthModalOpen(false);
                        setAuthRedirectTarget(null);
                    }}
                    afterLoginRedirect={authRedirectTarget}
                />
            ) : null}
        </nav>
    )
}

export default SESDCHeader
