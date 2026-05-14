import {
  FileText,
  Sheet,
  Presentation,
  FormInput,
  Settings,
  HelpCircle,
  HardDrive,
  Menu
} from 'lucide-react'

function Sidebar() {

  const menuItems = [

    {
      icon: <FileText size={20} />,
      label: 'Docs'
    },

    {
      icon: <Sheet size={20} />,
      label: 'Sheets'
    },

    {
      icon: <Presentation size={20} />,
      label: 'Slides'
    },

    {
      icon: <FormInput size={20} />,
      label: 'Forms'
    }
  ]

  return (

    <div
      style={{

        width: '260px',

        height: '100vh',

        background: 'white',

        borderRight:
          '1px solid #e5e7eb',

        position: 'fixed',

        left: 0,

        top: 0,

        display: 'flex',

        flexDirection: 'column'
      }}
    >

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '14px',

          padding: '20px'
        }}
      >

        <Menu size={22} />

        <div
          style={{

            fontSize: '32px',

            fontWeight: 600,

            color: '#4285F4'
          }}
        >
          SyncSpace
        </div>

        <div
          style={{

            fontSize: '32px',

            fontWeight: 500,

            color: '#5f6368'
          }}
        >
        </div>

      </div>

      <div
        style={{
          marginTop: '10px'
        }}
      >

        {menuItems.map(item => (

          <div

            key={item.label}

            style={{

              display: 'flex',

              alignItems: 'center',

              gap: '16px',

              padding:
                '14px 24px',

              cursor: 'pointer',

              color: '#374151',

              transition: '0.2s'
            }}
          >

            {item.icon}

            <span
              style={{
                fontSize: '16px'
              }}
            >
              {item.label}
            </span>

          </div>

        ))}

      </div>

      <div
        style={{
          marginTop: 'auto'
        }}
      >

        <div
          style={{

            display: 'flex',

            alignItems: 'center',

            gap: '16px',

            padding:
              '14px 24px',

            cursor: 'pointer',

            color: '#374151'
          }}
        >

          <Settings size={20} />

          <span>Settings</span>

        </div>

        <div
          style={{

            display: 'flex',

            alignItems: 'center',

            gap: '16px',

            padding:
              '14px 24px',

            cursor: 'pointer',

            color: '#374151'
          }}
        >

          <HelpCircle size={20} />

          <span>Help & Feedback</span>

        </div>

        <div
          style={{

            display: 'flex',

            alignItems: 'center',

            gap: '16px',

            padding:
              '14px 24px',

            cursor: 'pointer',

            color: '#374151',

            borderTop:
              '1px solid #e5e7eb'
          }}
        >

          <HardDrive size={20} />

          <span>Drive</span>

        </div>

      </div>

    </div>
  )
}

export default Sidebar