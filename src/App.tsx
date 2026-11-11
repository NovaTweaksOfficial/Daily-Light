import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Spinner } from '@/components/ui'

const HomeView = lazy(() => import('@/views/HomeView'))
const BibleView = lazy(() => import('@/views/BibleView'))
const BookChaptersView = lazy(() => import('@/views/BookChaptersView'))
const ReaderView = lazy(() => import('@/views/ReaderView'))
const DailyView = lazy(() => import('@/views/DailyView'))
const ListenView = lazy(() => import('@/views/ListenView'))
const PlansView = lazy(() => import('@/views/PlansView'))
const PlanDetailView = lazy(() => import('@/views/PlanDetailView'))
const SavedView = lazy(() => import('@/views/SavedView'))
const SearchView = lazy(() => import('@/views/SearchView'))
const SettingsView = lazy(() => import('@/views/SettingsView'))

function RouteFallback() {
  return (
    <div className="view loading-block">
      <Spinner />
    </div>
  )
}

/** Scrolls to top on route change (the reader manages its own scroll). */
function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/read/')) return // reader restores / targets its verse
    window.scrollTo({ top: 0 })
  }, [pathname, search])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<RouteFallback />}>
                <HomeView />
              </Suspense>
            }
          />
          <Route
            path="bible"
            element={
              <Suspense fallback={<RouteFallback />}>
                <BibleView />
              </Suspense>
            }
          />
          <Route
            path="bible/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <BookChaptersView />
              </Suspense>
            }
          />
          <Route
            path="read/:book/:chapter"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ReaderView />
              </Suspense>
            }
          />
          <Route
            path="daily"
            element={
              <Suspense fallback={<RouteFallback />}>
                <DailyView />
              </Suspense>
            }
          />
          <Route
            path="listen"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ListenView />
              </Suspense>
            }
          />
          <Route
            path="plans"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PlansView />
              </Suspense>
            }
          />
          <Route
            path="plans/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PlanDetailView />
              </Suspense>
            }
          />
          <Route
            path="saved"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SavedView />
              </Suspense>
            }
          />
          <Route
            path="search"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SearchView />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SettingsView />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
