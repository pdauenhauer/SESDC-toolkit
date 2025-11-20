import { useState } from "preact/hooks";
import { registerUser } from "../utils/firebase/auth";

interface RegisterFormProps {
    isVisible?: boolean;
    showLogin: () => void;
}

function RegisterForm({ isVisible, showLogin }: RegisterFormProps) {
    if (!isVisible) return null;

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [registerMessage, setRegisterMessage] = useState("");

    return (
        <div className="registerForm">
            <h1>Create an Account</h1>

            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    const message = await registerUser(email, password, username);
                    setRegisterMessage(message);
                }}
            >
                {registerMessage && (
                    <div className="messageDiv">{registerMessage}</div>
                )}

                <div className="input-box">
                    <input
                        type="text"
                        placeholder="Email"
                        value={email}
                        required
                        onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                    />
                    <i class="bx bxs-envelope"></i>
                </div>

                <div className="input-box">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        required
                        onChange={(e) => setUsername((e.target as HTMLInputElement).value)}
                    />
                    <i class="bx bxs-user"></i>
                </div>

                <div className="input-box">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        required
                        onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                    />
                    <i class="bx bxs-lock-alt"></i>
                </div>

                <button type="submit" className="btn">Register</button>
            </form>

            <div className="register">
                <p>
                    Already have an account?{" "}
                    <a href="#" className="toggle-form" onClick={showLogin}>
                        Login
                    </a>
                </p>
            </div>
        </div>
    );
}

export default RegisterForm;
