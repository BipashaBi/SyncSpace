import { useParams } from 'react-router-dom'

import Editor from '../components/Editor'


function DocumentPage() {

  const { id } = useParams()

  return (

    <div>

      <h1
        style={{
          textAlign: 'center',
          color: 'white',
          fontSize: '60px'
        }}
      >
        Google Docs
      </h1>

      <Editor roomId={id || 'default'} />

    </div>
  )
}

export default DocumentPage