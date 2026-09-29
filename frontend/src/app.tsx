import { LocationProvider, ErrorBoundary, Router, Route, useLocation } from 'preact-iso'
import About from './pages/About'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Account from './pages/Account'
import Projects from './pages/Projects'
import NewProjectWizard from './pages/NewProjectWizard'
import Logout from './pages/Logout'
import UserGuide from './pages/UserGuide'
import SESDCHeader from './components/SESDCHeader'
import SESDCFooter from './components/SESDCFooter'
import { ToastProvider } from './components/ui'
import '../src/css/SESDCFooter.css'
import '../src/css/SESDCHeader.css'
//import './app.css'

function AppRoutes() {
  const { path } = useLocation()
  const normalizedPath = path !== '/' ? path.replace(/\/+$/, '') : '/'
  const staticRoutes = new Set(['/about', '/contact', '/guide'])
  const noScrollStaticRoutes = new Set(['/contact'])
  const showStaticChrome = staticRoutes.has(normalizedPath)
  const disableStaticScroll = noScrollStaticRoutes.has(normalizedPath)

  const shellClassName = showStaticChrome
    ? `static-page-shell${disableStaticScroll ? ' static-page-shell--no-scroll' : ''}`
    : undefined

  const contentClassName = showStaticChrome
    ? `static-page-content${disableStaticScroll ? ' static-page-content--no-scroll' : ''}`
    : undefined

  return (
    <div class={shellClassName}>
      {showStaticChrome && <SESDCHeader />}
      <div class={contentClassName}>
        <Router>
          <Route path="/" component={Home}/>
          <Route path="/projects" component={Projects} />
          <Route path="/projects/new" component={NewProjectWizard} />
          <Route path="/about" component={About}/>
          <Route path="/contact" component={Contact}/>
          <Route path="/account" component={Account}/>
          <Route path="/logout" component={Logout}/>
          <Route path="/guide" component={UserGuide}/>
        </Router>
      </div>
      {showStaticChrome && <SESDCFooter />}
    </div>
  )
}

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary onError={e => alert(e)}>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ErrorBoundary>
    </LocationProvider>
  )
}
