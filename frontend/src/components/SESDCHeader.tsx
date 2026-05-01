import logo from '../media/Logo.svg'
import accountDefaultIcon from '../media/circle-user-4.svg'
import accountHoverIcon from '../media/circle-user-3.svg'
import { useState, useEffect } from 'preact/hooks'
import { useLocation } from 'preact-iso'

import { auth } from '../utils/firebase/firebase-init';
import { onAuthStateChanged, User } from 'firebase/auth';

function SESDCHeader() {
    const [user, setUser] = useState<User | null>(() => auth.currentUser);
    const [hasScrolled, setHasScrolled] = useState<boolean>(false);
    const { route } = useLocation();
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

    return (
        <nav class={hasScrolled ? 'nav-scrolled' : ''}>
            <input type="checkbox" id="check" />
            <label htmlFor="check" class="check-btn">
            <i class="bx bx-menu"></i>
            </label>

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
                            className={`${isActive('/contact')} nav-home-link`.trim()}
                            href="/contact"
                            aria-label="Help"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/contact')}
                        >
                            <span>Help</span>
                        </a>
                    </li>
                </div>
            </div>

            <div class="nav-links nav-links-right">
                {!user && (
                    <li>
                        <a
                            className={`${isActive('/login')} nav-home-link`.trim()}
                            href="/login"
                            onClick={(event) => handleNavClick(event as MouseEvent, '/login')}
                        >
                            Sign in
                        </a>
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
                {/* add authentication logic */}
                {user ? (
                    <>
                        <li>
                            <a
                                className={`${isActive('/projects')} nav-home-link`.trim()}
                                href="/projects"
                                aria-label="Projects"
                                onClick={(event) => handleNavClick(event as MouseEvent, '/projects')}
                            >
                                <span>Projects</span>
                            </a>
                        </li>
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
                                className={`${isActive('/contact')} nav-home-link`.trim()}
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
                                aria-label="User Guide"
                                onClick={(event) => handleNavClick(event as MouseEvent, '/guide')}
                            >
                                <span>User Guide</span>
                            </a>
                        </li>
                        <li>
                            <a
                                className={`${isActive('/account')} nav-home-link`.trim()}
                                href="/account"
                                aria-label="Account"
                                onClick={(event) => handleNavClick(event as MouseEvent, '/account')}
                            >
                                <span>Account</span>
                            </a>
                        </li>
                    </>
                ) : (
                    <>
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
                                className={`${isActive('/contact')} nav-home-link`.trim()}
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
                                aria-label="User Guide"
                                onClick={(event) => handleNavClick(event as MouseEvent, '/guide')}
                            >
                                <span>User Guide</span>
                            </a>
                        </li>
                        <li>
                            <a
                                className={isActive('/login')}
                                href="/login"
                                onClick={(event) => handleNavClick(event as MouseEvent, '/login')}
                            >
                                Login
                            </a>
                        </li>
                    </>
                )}
                <li>
                    <a
                        className={`${isActive(user ? '/projects' : '/login')} nav-home-link`.trim()}
                        href={user ? '/projects' : '/login?next=/projects'}
                        aria-label="Open toolkit"
                        onClick={(event) =>
                            handleNavClick(
                                event as MouseEvent,
                                user ? '/projects' : '/login?next=/projects'
                            )
                        }
                    >
                        <span>Open Toolkit</span>
                    </a>
                </li>
            </div>
        </nav>
    )
}

export default SESDCHeader
