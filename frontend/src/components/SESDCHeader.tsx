import white_logo from '../media/Logo-white.svg'
import { useState, useEffect } from 'preact/hooks'
import { useLocation } from 'preact-iso'

import { auth } from '../utils/firebase/firebase-init';
import { onAuthStateChanged, User } from 'firebase/auth';

function SESDCHeader() {
    const [user, setUser] = useState<User | null>(() => auth.currentUser);
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

    return (
        <nav>
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
                    <img src={white_logo} alt="SESDC logo" class="nav-logo" />
                    <span class="logo-nav">Microgrid Toolkit</span>
                </a>
            </div>

            <div class="nav-links">
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
                                className={isActive('/login')}
                                href="/login"
                                onClick={(event) => handleNavClick(event as MouseEvent, '/login')}
                            >
                                Login
                            </a>
                        </li>
                    </>
                )}
            </div>
        </nav>
    )
}

export default SESDCHeader
