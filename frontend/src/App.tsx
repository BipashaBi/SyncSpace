import {
  Routes,
  Route
} from 'react-router-dom'

import HomePage from './pages/HomePage'

import DocumentPage
from './pages/DocumentPage'

function App() {

  return (

    <Routes>

      <Route

        path="/"

        element={<HomePage />}

      />

      <Route

        path="/docs/:id"

        element={<DocumentPage />}

      />

    </Routes>
  )
}

export default App