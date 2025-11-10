// src/pages/Home.tsx
import { FunctionalComponent } from "preact";
import '../css/homepage.css';
import SESDCHeader from "../components/SESDCHeader";
import SESDCFooter from "../components/SESDCFooter";
import graph from '../media/graph.png';


const Home: FunctionalComponent = () => {
  return (
    <div class="min-h-screen flex flex-col">
    {/* navbar */}
      <SESDCHeader />

      <main class="content-wrapper">
        <section class="hero-section">
          <div class="content-box">
            <div class="hero-image">
              <img src={graph} alt="Graph Example" class="graph-image" />
            </div>

            <div class="left-content">
              <h1>Welcome to the SESDC Microgrid Toolkit</h1>
              <h3>Design, simulate, and plan your microgrid with ease.</h3>
              <button
                class="design-tool-button"
                onClick={() => (window.location.href = '/login')}
              >
                Open Design Tool
              </button>
            </div>
          </div>
        </section>

        <section class="overview-section">
          <p>
            Understanding Our Project: Learn why we created this tool and how it benefits users.
            In addition to answering any questions you may have.
          </p>
          <button
            class="get-started"
            onClick={() => (window.location.href = '/help')}
          >
            Learn More!
          </button>
        </section>
      </main>

      <SESDCFooter />
    </div>
  );
};

export default Home;
