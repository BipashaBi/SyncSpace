import {
  Share2,
  MessageCircle,
  ChevronDown,
  Plus,
  LogOut,
  Settings
} from 'lucide-react'

import {
  useState
} from 'react'

function EditorNavbar({

  documentTitle,

  setDocumentTitle

}: any) {

  const [
    showAccountMenu,

    setShowAccountMenu

  ] = useState(false)

  const accounts = [

    {
      name: 'Bipasha Biswas',
      email:
        'bipasha@gmail.com',
      color: '#2563eb'
    },

    {
      name: 'University Account',
      email:
        'bipasha@kiit.ac.in',
      color: '#7c3aed'
    }
  ]

  return (

    <div
      style={{

        height: '72px',

        background: 'white',

        borderBottom:
          '1px solid #e5e7eb',

        display: 'flex',

        alignItems: 'center',

        justifyContent:
          'space-between',

        padding: '0 24px',

        position: 'sticky',

        top: 0,

        zIndex: 100
      }}
    >

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '18px'
        }}
      >

        <img

          src="https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico"

          alt="docs"

          style={{
            width: '42px',
            height: '42px'
          }}
        />

        <div>

          <input

            value={documentTitle}

            onChange={(e) => {

              setDocumentTitle(
                e.target.value
              )
            }}

            style={{

              border: 'none',

              outline: 'none',

              fontSize: '22px',

              fontWeight: 500,

              color: '#202124',

              background:
                'transparent'
            }}
          />

          <div
            style={{
              color: '#5f6368',
              fontSize: '13px'
            }}
          >
            Saved to cloud
          </div>

        </div>

      </div>

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '16px',

          position: 'relative'
        }}
      >

        <MessageCircle
          size={22}
          color="#5f6368"
        />

        <button
          style={{

            background: '#0b57d0',

            color: 'white',

            border: 'none',

            padding:
              '10px 20px',

            borderRadius: '999px',

            display: 'flex',

            alignItems: 'center',

            gap: '8px',

            fontWeight: 500,

            cursor: 'pointer'
          }}
        >

          <Share2 size={18} />

          Share

        </button>

        <div

          onClick={() => {

            setShowAccountMenu(
              !showAccountMenu
            )
          }}

          style={{

            display: 'flex',

            alignItems: 'center',

            gap: '8px',

            cursor: 'pointer'
          }}
        >

          <div
            style={{

              width: '40px',

              height: '40px',

              borderRadius: '50%',

              background: '#2563eb',

              color: 'white',

              display: 'flex',

              alignItems: 'center',

              justifyContent:
                'center',

              fontWeight: 'bold'
            }}
          >
            B
          </div>

          <ChevronDown
            size={18}
            color="#5f6368"
          />

        </div>

        {showAccountMenu && (

          <div
            style={{

              position: 'absolute',

              top: '65px',

              right: 0,

              width: '340px',

              background: 'white',

              borderRadius: '16px',

              boxShadow:
                '0 10px 30px rgba(0,0,0,0.15)',

              border:
                '1px solid #e5e7eb',

              overflow: 'hidden'
            }}
          >

            <div
              style={{
                padding: '24px'
              }}
            >

              <div
                style={{

                  fontWeight: 600,

                  marginBottom: '20px',

                  color: '#202124'
                }}
              >
                Google Accounts
              </div>

              {accounts.map(
                account => (

                  <div

                    key={account.email}

                    style={{

                      display: 'flex',

                      alignItems: 'center',

                      gap: '14px',

                      padding:
                        '12px 0',

                      cursor: 'pointer'
                    }}
                  >

                    <div
                      style={{

                        width: '42px',

                        height: '42px',

                        borderRadius:
                          '50%',

                        background:
                          account.color,

                        color: 'white',

                        display: 'flex',

                        alignItems:
                          'center',

                        justifyContent:
                          'center',

                        fontWeight:
                          'bold'
                      }}
                    >
                      {
                        account.name[0]
                      }
                    </div>

                    <div>

                      <div
                        style={{
                          fontWeight: 500
                        }}
                      >
                        {account.name}
                      </div>

                      <div
                        style={{
                          color:
                            '#5f6368',
                          fontSize:
                            '14px'
                        }}
                      >
                        {account.email}
                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

            <div
              style={{
                borderTop:
                  '1px solid #e5e7eb'
              }}
            >

              <div
                style={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: '12px',

                  padding:
                    '16px 24px',

                  cursor: 'pointer'
                }}
              >

                <Plus size={18} />

                Add another account

              </div>

              <div
                style={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: '12px',

                  padding:
                    '16px 24px',

                  cursor: 'pointer'
                }}
              >

                <Settings size={18} />

                Manage accounts

              </div>

              <div
                style={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: '12px',

                  padding:
                    '16px 24px',

                  cursor: 'pointer',

                  color: '#dc2626'
                }}
              >

                <LogOut size={18} />

                Sign out

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  )
}

export default EditorNavbar