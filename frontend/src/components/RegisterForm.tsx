interface RegisterFormProps {
    registerMessage?: string;
    isVisible?: boolean;
    handleRegisterSubmit: (e: Event) => void;
    showLogin: (e: Event) => void;
}

function RegisterForm({ registerMessage, isVisible, handleRegisterSubmit, showLogin }: RegisterFormProps) {
    if (!isVisible) return null;
    return (
        <div
            id="registerForm"
        >
            <h1>Create an Account</h1>
            <form id="signup-form" onSubmit={handleRegisterSubmit}>
                {registerMessage && (
                    <div id="account-creation-message" class="messageDiv" style="display: block;">
                        {registerMessage}
                    </div>
                )}

                <div class="input-box">
                    <input id="enterEmail" type="text" placeholder="Email" required />
                    <i class="bx bxs-envelope"></i>
                </div>
                <div class="input-box">
                    <input id="enterUsername" type="text" placeholder="Username" required />
                    <i class="bx bxs-user"></i>
                </div>
                <div class="input-box">
                    <input id="enterPassword" type="password" placeholder="Password" required />
                    <i class="bx bxs-lock-alt"></i>
                </div>
                <button id="register" type="submit" class="btn">
                    Register
                </button>
            </form>
            <div class="register">
                <p>
                    Already have an account?{' '}
                    <a href="#" class="toggle-form" onClick={showLogin}>
                        Login
                    </a>
                </p>
            </div>
        </div>
    )
}

export default RegisterForm;