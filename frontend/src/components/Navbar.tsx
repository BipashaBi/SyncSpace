function Navbar() {

  return (

    <div
      style={{

        height: '64px',

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

        zIndex: 999
      }}
    >

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '16px'
        }}
      >

        <div
          style={{
            fontSize: '28px'
          }}
        >

        </div>

      </div>

      <div
        style={{

          width: '45%',

          background: '#f1f3f4',

          borderRadius: '8px',

          padding: '12px 18px',

          color: '#5f6368'
        }}
      >
        🔍 Search documents
      </div>

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '16px'
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

            justifyContent: 'center',

            fontWeight: 'bold'
          }}
        >
          B
        </div>

      </div>

    </div>
  )
}

export default Navbar