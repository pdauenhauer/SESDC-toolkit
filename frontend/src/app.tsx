/*import './app.css'
import { LocationProvider, ErrorBoundary, Router, Route } from 'preact-iso'
import About from './pages/About'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Account from './pages/Account'
import UserGuide from './pages/UserGuide'
import Login from './pages/Login'

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary onError={e => alert(e)}> 
        <Router>
          <Route path="/" component={Home}/>
          <Route path="/about" component={About}/>
          <Route path="/contact" component={Contact}/>
          <Route path="/account" component={Account}/>
          <Route path="/guide" component={UserGuide}/>
          <Route path="/login" component={Login}/>
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  )
}*/

import './app.css';
import { LocationProvider, ErrorBoundary, Router, Route } from 'preact-iso';
import About from './pages/Login';
import Contact from './pages/Login';
import Login from './pages/Account';
import Account from './pages/Account';

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary onError={(e) => alert(e)}>
        <Router>
          {/* show About at /about */}
          <Route path="/Account" component={Account} />
          {/* if you also want it at /, add this: */}
          <Route path="/" component={Account} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}
