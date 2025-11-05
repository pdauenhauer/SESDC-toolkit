import './app.css'
import { LocationProvider, ErrorBoundary, Router, Route } from 'preact-iso'
import About from './pages/About'
import Home from './pages/Home'

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary onError={e => alert(e)}> 
        <Router>
          <Route path="/" component={Home}/>
          <Route path="/about" component={About}/>
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  )
}
