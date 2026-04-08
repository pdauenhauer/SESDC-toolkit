import white_logo from '../media/Logo-white.svg'
import homeIcon from '../media/house-2.svg'
import accountIcon from '../media/circle-user-2.svg'
import projectsIcon from '../media/boxes-3.svg'
import aboutIcon from '../media/info.svg'
import contactIcon from '../media/mail-4.svg'
import { useState, useEffect } from 'preact/hooks'
import Tooltip from './Tooltip'

import { auth } from '../utils/firebase/firebase-init';
import { onAuthStateChanged, User } from 'firebase/auth';

function SESDCHeader() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
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
                <img src={white_logo} alt="Logo" class="nav-logo" />
                <label class="logo-nav">Microgrid Toolkit</label>
            </div>

            <div class="nav-links">
                {/* add authentication logic */}
                {!isLoading && user ? (
                    <>
                        <li>
                            <Tooltip text="Home" position="bottom">
                                <a
                                    className={`${isActive('/')} nav-home-link`.trim()}
                                    href="/"
                                    aria-label="Home"
                                >
                                    <img src={homeIcon} alt="" class="nav-home-icon" />
                                    <span>Home</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text="Projects" position="bottom">
                                <a
                                    className={`${isActive('/projects')} nav-home-link`.trim()}
                                    href="/projects"
                                    aria-label="Projects"
                                >
                                    <img src={projectsIcon} alt="" class="nav-home-icon" />
                                    <span>Projects</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text="About" position="bottom">
                                <a
                                    className={`${isActive('/about')} nav-home-link`.trim()}
                                    href="/about"
                                    aria-label="About"
                                >
                                    <img src={aboutIcon} alt="" class="nav-home-icon" />
                                    <span>About</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text="Contact" position="bottom">
                                <a
                                    className={`${isActive('/contact')} nav-home-link`.trim()}
                                    href="/contact"
                                    aria-label="Contact"
                                >
                                    <img src={contactIcon} alt="" class="nav-home-icon" />
                                    <span>Contact</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text="Account" position="bottom">
                                <a
                                    className={`${isActive('/account')} nav-home-link`.trim()}
                                    href="/account"
                                    aria-label="Account"
                                >
                                    <img src={accountIcon} alt="" class="nav-home-icon" />
                                    <span>Account</span>
                                </a>
                            </Tooltip>
                        </li>
                    </>
                ) : (
                    <>
                        <li>
                            <Tooltip text="Home" position="bottom">
                                <a
                                    className={`${isActive('/')} nav-home-link`.trim()}
                                    href="/"
                                    aria-label="Home"
                                >
                                    <img src={homeIcon} alt="" class="nav-home-icon" />
                                    <span>Home</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text="About" position="bottom">
                                <a
                                    className={`${isActive('/about')} nav-home-link`.trim()}
                                    href="/about"
                                    aria-label="About"
                                >
                                    <img src={aboutIcon} alt="" class="nav-home-icon" />
                                    <span>About</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text="Contact" position="bottom">
                                <a
                                    className={`${isActive('/contact')} nav-home-link`.trim()}
                                    href="/contact"
                                    aria-label="Contact"
                                >
                                    <img src={contactIcon} alt="" class="nav-home-icon" />
                                    <span>Contact</span>
                                </a>
                            </Tooltip>
                        </li>
                        <li><a className={isActive('/login')} href="/login">Login</a></li>
                    </>
                )}
            </div>
        </nav>
    )
}

export default SESDCHeader
