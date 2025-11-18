import { useState } from "react";
import { loginUser } from '../utils/firebase/auth';

interface LoginFormProps {
    loginMessage?: string;
    isVisible?: boolean;
    showRegister: () => void;
}

function LoginForm({ isVisible, showRegister }: LoginFormProps) {
    if (!isVisible) return null;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginMessage, setLoginMessage] = useState("");

    return (
        <div className="loginForm">
            <h1>Login</h1>

            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    const message = await loginUser(email, password);
                    setLoginMessage(message || "");
                }}
            >
                {loginMessage && (
                    <div className="messageDiv">
                        {loginMessage}
                    </div>
                )}

                <div className="input-box">
                    <input
                        type="text"
                        placeholder="Email"
                        value={email}
                        required
                        onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                    />
                    <i className="bx bxs-user"></i>
                </div>

                <div className="input-box">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        required
                        onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                    />
                    <i className="bx bxs-lock-alt"></i>
                </div>

                <button type="submit" className="btn">
                    Login
                </button>
            </form>

            <div className="register">
                <p>
                    Don't have an account?{" "}
                    <a href="#" className="toggle-form" onClick={showRegister}>
                        Register
                    </a>
                </p>
            </div>
        </div>
    );
}

export default LoginForm;
