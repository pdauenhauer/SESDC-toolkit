interface LoginFormProps {
    loginMessage?: string;
    isVisible?: boolean;
    handleLoginSubmit: (e: Event) => void;
    showRegister: (e: Event) => void;
}

function LoginForm({ loginMessage, isVisible, handleLoginSubmit, showRegister }: LoginFormProps) {
    if(!isVisible) return null;
    
    return (
        
        <div id="loginForm">
            <h1>Login</h1>
            <form id="login-form" onSubmit={handleLoginSubmit}>
                {loginMessage && (
                    <div id="account-login-message" class="messageDiv" style="display: block;">
                        {loginMessage}
                    </div>
                )}

                <div class="input-box">
                    <input id="loginEmail" type="text" placeholder="Email" required />
                    <i class="bx bxs-user"></i>
                </div>
                <div class="input-box">
                    <input id="loginPassword" type="password" placeholder="Password" required />
                    <i class="bx bxs-lock-alt"></i>
                </div>
                <button id="login" type="submit" class="btn">
                    Login
                </button>
            </form>
            <div class="register">
                <p>
                    Don't have an account?{' '}
                    <a href="#" class="toggle-form" onClick={showRegister}>
                        Register
                    </a>
                </p>
            </div>
        </div>
    )
}

export default LoginForm