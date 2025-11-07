import white_logo from '../media/Logo-white.svg'

function SESDCHeader() {
    const isActive = (path: string): string => {
        return window.location.pathname === path ? 'active' : ''
    }
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
                {true ? (
                    <>
                        <li><a className={isActive('/')} href="/">Home</a></li>
                        <li><a className={isActive('/projects')} href="/projects">Projects</a></li>
                        <li><a className={isActive('/about')} href="/about">About</a></li>
                        <li><a className={isActive('/contact')} href="/contact">Contact</a></li>
                        <li><a className={isActive('/account')} href="/account">Account</a></li>
                        <li><a className={isActive('/guide')} href="/guide">User Guide</a></li>
                        <li><a className={isActive('/logout')} href="/login">Logout</a></li>
                    </>
                ) : (
                    <>
                        <li><a className={isActive('/')} href="/">Home</a></li>
                        <li><a className={isActive('/about')} href="/about">About</a></li>
                        <li><a className={isActive('/contact')} href="/contact">Contact</a></li>
                        <li><a className={isActive('/guide')} href="/guide">User Guide</a></li>
                        <li><a className={isActive('/login')} href="/login">Login</a></li>
                    </>
                )}
            </div>
        </nav>
    )
}

export default SESDCHeader
