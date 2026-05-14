import Navbar
  from './Navbar'

import Sidebar
  from './Sidebar'

function EditorLayout({
  children
}: any) {

  return (

    <div>

      <Navbar />

      <div
        style={{
          display: 'flex'
        }}
      >

        <Sidebar />

        <div
          style={{
            flex: 1
          }}
        >
          {children}
        </div>

      </div>

    </div>
  )
}

export default EditorLayout