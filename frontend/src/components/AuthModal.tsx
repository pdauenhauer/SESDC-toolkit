import { useEffect, useState } from 'preact/hooks'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import closeIcon from '../media/x.svg'
import '../css/login.css'

interface AuthModalProps {
  onClose: () => void
  afterLoginRedirect?: string | null
}

export default function AuthModal({ onClose, afterLoginRedirect = null }: AuthModalProps) {
  const [isLoginActive, setIsLoginActive] = useState<boolean>(true)

  const showLogin = (e?: Event) => {
    e?.preventDefault()
    setIsLoginActive(true)
  }

  const showRegister = (e?: Event) => {
    e?.preventDefault()
    setIsLoginActive(false)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div class="auth-modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="login-wrapper auth-modal-wrapper"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          class="auth-modal-close-btn"
          aria-label="Close sign in modal"
          onClick={onClose}
        >
          <img src={closeIcon} alt="" aria-hidden="true" class="auth-modal-close-icon" />
        </button>

        <LoginForm
          isVisible={isLoginActive}
          showRegister={showRegister}
          afterLoginRedirect={afterLoginRedirect}
          onSuccess={onClose}
        />
        <RegisterForm isVisible={!isLoginActive} showLogin={showLogin} />
      </div>
    </div>
  )
}
