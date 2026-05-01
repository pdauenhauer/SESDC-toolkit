import graph from '../media/graph.png';
import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase/firebase-init';
import '../css/homepage.css';


function Home () {
  const { route } = useLocation();
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => !!auth.currentUser);

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
                onClick={() => route(isSignedIn ? '/projects' : '/login?next=/projects')}
              >
                Get Started
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;
