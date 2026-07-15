import { useParams } from 'react-router-dom'

import Editor from '../components/Editor'


function DocumentPage() {

  const { id } = useParams()

  return (

      <Editor roomId={id || 'default'} />

    
  )
}

export default DocumentPage