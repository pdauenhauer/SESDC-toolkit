import graph from '../media/graph.png';
import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase/firebase-init';
import AuthModal from '../components/AuthModal';
import '../css/homepage.css';


function Home () {
  const { route } = useLocation();
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => !!auth.currentUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsSignedIn(!!currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div class="home-page">
      <main class="home-content-wrapper">
        <section class="home-hero-section">
          <div class="home-content-box">
            <div class="home-left-content">
              <div class="home-hero-image">
                <img src={graph} alt="Graph Example" class="home-graph-image" />
              </div>
              <h1>
                Welcome to the
                <br />
                SESDC Microgrid Toolkit
              </h1>
              <h3>Design, simulate, and plan your microgrid with ease.</h3>
              <button
                class="home-design-tool-button"
                onClick={() => {
                  if (isSignedIn) {
                    route('/projects');
                    return;
                  }
                  setIsAuthModalOpen(true);
                }}
              >
                Get Started
              </button>
            </div>
          </div>
        </section>

      </main>
      {isAuthModalOpen ? (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          afterLoginRedirect="/projects"
        />
      ) : null}
    </div>
  );
};

export default Home;
