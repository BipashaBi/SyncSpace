import {
  useNavigate
} from 'react-router-dom'

import {
  useEffect,
  useState
} from 'react'

import {
  MoreVertical,
  FileText
} from 'lucide-react'

import Sidebar from '../components/Sidebar'

import Navbar from '../components/Navbar'

function HomePage() {

  const navigate =
    useNavigate()

  const [documents,
    setDocuments] =
    useState<any[]>([])

  useEffect(() => {

    fetch(
      'http://localhost:8080/documents'
    )

      .then(res => res.json())

      .then(data => {

        console.log(
          'Documents:',
          data
        )

        setDocuments(data || [])
      })

      .catch(err => {

        console.error(
          'Documents fetch error:',
          err
        )

        setDocuments([])
      })

  }, [])

  function createNewDocument() {

    const documentId =
      crypto.randomUUID()

    navigate(
      `/docs/${documentId}`
    )
  }

  const templates = [

    {
      title: 'Blank',
      subtitle: 'Document'
    },

    {
      title: 'Resume',
      subtitle: 'Professional'
    },

    {
      title: 'Project Proposal',
      subtitle: 'Business'
    },

    {
      title: 'Letter',
      subtitle: 'Formal'
    },

    {
      title: 'Report',
      subtitle: 'Modern'
    }
  ]

  return (

    <div
      style={{
        background: '#f1f3f4',
        minHeight: '100vh'
      }}
    >

      <Sidebar />

      <div
        style={{
          marginLeft: '260px'
        }}
      >

        <Navbar />

        <div
          style={{
            padding: '40px'
          }}
        >

          <div
            style={{
              marginBottom: '60px'
            }}
          >

            <div
              style={{

                display: 'flex',

                justifyContent:
                  'space-between',

                alignItems: 'center',

                marginBottom: '20px'
              }}
            >

              <h2
                style={{
                  color: '#202124'
                }}
              >
                Start a new document
              </h2>

              <div
                style={{
                  color: '#5f6368'
                }}
              >
                Template gallery
              </div>

            </div>

            <div
              style={{

                display: 'flex',

                gap: '24px',

                overflowX: 'auto'
              }}
            >

              {templates.map(
                template => (

                  <div

                    key={template.title}

                    onClick={
                      createNewDocument
                    }

                    style={{

                      cursor: 'pointer'
                    }}
                  >

                    <div
                      style={{

                        width: '180px',

                        height: '240px',

                        background: 'white',

                        border:
                          '1px solid #dadce0',

                        borderRadius: '8px',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent:
                          'center',

                        transition: '0.2s'
                      }}
                    >

                      <FileText
                        size={70}
                        color="#4285F4"
                      />

                    </div>

                    <div
                      style={{
                        marginTop: '10px'
                      }}
                    >

                      <div
                        style={{
                          fontWeight: 500,
                          color: '#202124'
                        }}
                      >
                        {template.title}
                      </div>

                      <div
                        style={{
                          color: '#5f6368',
                          fontSize: '14px'
                        }}
                      >
                        {template.subtitle}
                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

          <div>

            <div
              style={{

                display: 'flex',

                justifyContent:
                  'space-between',

                alignItems: 'center',

                marginBottom: '25px'
              }}
            >

              <h2
                style={{
                  color: '#202124'
                }}
              >
                Recent documents
              </h2>

              <div
                style={{
                  color: '#5f6368'
                }}
              >
                Owned by anyone
              </div>

            </div>

            <div
              style={{

                display: 'grid',

                gridTemplateColumns:
                  'repeat(auto-fill, minmax(260px, 1fr))',

                gap: '30px'
              }}
            >

              {documents?.map(doc => (

                <div

                  key={doc.roomId}

                  onClick={() => {

                    navigate(
                      `/docs/${doc.roomId}`
                    )
                  }}

                  style={{

                    cursor: 'pointer'
                  }}
                >

                  <div
                    style={{

                      height: '320px',

                      background: 'white',

                      border:
                        '1px solid #dadce0',

                      borderRadius: '8px',

                      overflow: 'hidden',

                      boxShadow:
                        '0 1px 2px rgba(0,0,0,0.08)'
                    }}
                  >

                    <div
                      style={{

                        height: '240px',

                        background:
                          '#ffffff',

                        borderBottom:
                          '1px solid #e5e7eb',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent:
                          'center',

                        color: '#94a3b8',

                        fontSize: '14px'
                      }}
                    >
                      Document Preview
                    </div>

                    <div
                      style={{
                        padding: '16px'
                      }}
                    >

                      <div
                        style={{

                          display: 'flex',

                          justifyContent:
                            'space-between',

                          alignItems: 'center'
                        }}
                      >

                        <div
                          style={{

                            fontWeight: 500,

                            color: '#202124',

                            overflow: 'hidden',

                            textOverflow:
                              'ellipsis',

                            whiteSpace:
                              'nowrap',

                            maxWidth: '180px'
                          }}
                        >
                          {doc.title ||
                            'Untitled document'}
                        </div>

                        <MoreVertical
                          size={18}
                          color="#5f6368"
                        />

                      </div>

                      <div
                        style={{

                          marginTop: '12px',

                          display: 'flex',

                          alignItems: 'center',

                          gap: '10px',

                          color: '#5f6368',

                          fontSize: '14px'
                        }}
                      >

                        <FileText
                          size={16}
                        />

                        {

                          doc.updatedAt

                            ? new Date(
                                doc.updatedAt
                              ).toLocaleString()

                            : 'Recently'
                        }

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default HomePage