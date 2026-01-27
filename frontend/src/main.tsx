import { render } from 'preact';
import { App } from './app.tsx';
import "./app.css";

if (import.meta.env.DEV) {
  import("./utils/firebase/tests/testdb")
    .then((mod) => {
      (window as any).FirestoreSmokeTest = mod;
      console.log("FirestoreSmokeTest loaded. Run:");
      console.log("  await FirestoreSmokeTest.runSmokeTest({ createCount: 2 })");
      console.log("  await FirestoreSmokeTest.cleanupSmokeTest()");
    })
    .catch((e) => {
      console.error("Failed to load Firestore smoke test module:", e);
    });
}

render(<App />, document.getElementById("app")!);
