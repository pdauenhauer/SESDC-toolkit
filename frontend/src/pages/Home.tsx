import graph from '../media/graph.png';
import { useLocation } from 'preact-iso';
import '../css/homepage.css';


function Home () {
  const { route } = useLocation();

  return (
    <div class="min-h-screen flex flex-col">
      <main class="home-content-wrapper flex-1">
        <section class="home-hero-section">
          <div class="home-content-box">
            <div class="home-hero-image">
              <img src={graph} alt="Graph Example" class="home-graph-image" />
            </div>

            <div class="home-left-content">
              <h1>Welcome to the SESDC Microgrid Toolkit</h1>
              <h3>Design, simulate, and plan your microgrid with ease.</h3>
              <button
                class="home-design-tool-button"
                onClick={() => route('/login')}
              >
                Open Design Tool
              </button>
            </div>
          </div>
        </section>

        <section class="home-overview-section">
          <p>
            Understanding Our Project: Learn why we created this tool and how it{" "}
            <br />
            benefits users. In addition to answering any questions you may have.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Home;
