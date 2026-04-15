import white_logo from '../media/Logo-white.svg'
import { useState, useEffect } from 'preact/hooks'

import { auth } from '../utils/firebase/firebase-init';
import { onAuthStateChanged, User } from 'firebase/auth';

function SESDCHeader() {
    const [user, setUser] = useState<User | null>(() => auth.currentUser);
    const [isLoading, setIsLoading] = useState<boolean>(() => auth.currentUser == null);
    const isActive = (path: string): string =>
        window.location.pathname === path ? 'active' : '';

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
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
                <a class="nav-brand" href="/" aria-label="Go to Home">
                    <img src={white_logo} alt="SESDC logo" class="nav-logo" />
                    <span class="logo-nav">Microgrid Toolkit</span>
                </a>
            </div>

            <div class="nav-links">
                {/* add authentication logic */}
                {isLoading ? null : user ? (
                    <>
                        <li>
                            <a
                                className={`${isActive('/projects')} nav-home-link`.trim()}
                                href="/projects"
                                aria-label="Projects"
                            >
                                <span>Projects</span>
                            </a>
                        </li>
                        <li>
                            <a
                                className={`${isActive('/about')} nav-home-link`.trim()}
                                href="/about"
                                aria-label="About"
                            >
                                <span>About</span>
                            </a>
                        </li>
                        <li>
                            <a
                                className={`${isActive('/contact')} nav-home-link`.trim()}
                                href="/contact"
                                aria-label="Contact"
                            >
                                <span>Contact</span>
                            </a>
                        </li>
                        <li>
                            <a
                                className={`${isActive('/account')} nav-home-link`.trim()}
                                href="/account"
                                aria-label="Account"
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
                            >
                                <span>About</span>
                            </a>
                        </li>
                        <li>
                            <a
                                className={`${isActive('/contact')} nav-home-link`.trim()}
                                href="/contact"
                                aria-label="Contact"
                            >
                                <span>Contact</span>
                            </a>
                        </li>
                        <li><a className={isActive('/login')} href="/login">Login</a></li>
                    </>
                )}
            </div>
        </nav>
    )
}

export default SESDCHeader
