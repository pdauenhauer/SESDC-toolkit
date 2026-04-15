import { LocationProvider, ErrorBoundary, Router, Route, useLocation } from 'preact-iso'
import About from './pages/About'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Account from './pages/Account'
import Projects from './pages/Projects'
import Login from './pages/Login'
import Logout from './pages/Logout'
import SESDCHeader from './components/SESDCHeader'
import SESDCFooter from './components/SESDCFooter'
import '../src/css/SESDCFooter.css'
import '../src/css/SESDCHeader.css'
//import './app.css'

function AppShell() {
  const { path } = useLocation()
  const useGlobalHeaderFooter = path !== '/projects'
  const disablePageScroll = path === '/' || path === '/account' || path === '/contact'
  const shellClass = [
    'app-shell-layout',
    useGlobalHeaderFooter ? '' : 'app-shell-layout--projects',
    disablePageScroll ? 'app-shell-layout--no-scroll' : '',
  ].join(' ').trim()

  return (
    <div class={shellClass}>
      {useGlobalHeaderFooter && <SESDCHeader />}
      <main class={useGlobalHeaderFooter ? 'app-route-content' : ''}>
        <Router>
          <Route path="/" component={Home}/>
          <Route path="/projects" component={Projects} />
          <Route path="/about" component={About}/>
          <Route path="/contact" component={Contact}/>
          <Route path="/account" component={Account}/>
          <Route path="/login" component={Login}/>
          <Route path="/logout" component={Logout}/>
        </Router>
      </main>
      {useGlobalHeaderFooter && <SESDCFooter />}
    </div>
  )
}

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary onError={e => alert(e)}> 
        <AppShell />
      </ErrorBoundary>
    </LocationProvider>
  )
}
