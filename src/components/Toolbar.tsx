import {
  useLexicalComposerContext
} from '@lexical/react/LexicalComposerContext'

import {

  FORMAT_TEXT_COMMAND,

  UNDO_COMMAND,

  REDO_COMMAND

} from 'lexical'

import {

  INSERT_UNORDERED_LIST_COMMAND,

  INSERT_ORDERED_LIST_COMMAND

} from '@lexical/list'

import {

  Bold,

  Italic,

  Underline,

  Undo2,

  Redo2,

  List,

  ListOrdered,

  AlignLeft,

  ChevronDown

} from 'lucide-react'

function Toolbar() {

  const [editor] =
    useLexicalComposerContext()

  const buttonStyle = {

    border: 'none',

    background: 'transparent',

    padding: '8px',

    borderRadius: '6px',

    cursor: 'pointer',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center'
  } as const

  return (

    <div
      style={{

        height: '56px',

        background: '#f8fafc',

        border:
          '1px solid #e5e7eb',

        borderRadius: '999px',

        display: 'flex',

        alignItems: 'center',

        padding: '0 18px',

        gap: '10px',

        position: 'sticky',

        top: '90px',

        zIndex: 50
      }}
    >

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(
            UNDO_COMMAND,
            undefined
          )
        }}
      >

        <Undo2 size={18} />

      </button>

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(
            REDO_COMMAND,
            undefined
          )
        }}
      >

        <Redo2 size={18} />

      </button>

      <div
        style={{
          width: '1px',
          height: '28px',
          background: '#d1d5db'
        }}
      />

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '6px',

          padding:
            '8px 12px',

          borderRadius: '6px',

          cursor: 'pointer'
        }}
      >

        Arial

        <ChevronDown size={16} />

      </div>

      <div
        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '6px',

          padding:
            '8px 12px',

          borderRadius: '6px',

          cursor: 'pointer'
        }}
      >

        11

        <ChevronDown size={16} />

      </div>

      <div
        style={{
          width: '1px',
          height: '28px',
          background: '#d1d5db'
        }}
      />

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(

            FORMAT_TEXT_COMMAND,

            'bold'
          )
        }}
      >

        <Bold size={18} />

      </button>

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(

            FORMAT_TEXT_COMMAND,

            'italic'
          )
        }}
      >

        <Italic size={18} />

      </button>

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(

            FORMAT_TEXT_COMMAND,

            'underline'
          )
        }}
      >

        <Underline size={18} />

      </button>

      <div
        style={{
          width: '1px',
          height: '28px',
          background: '#d1d5db'
        }}
      />

      <button
        style={buttonStyle}
      >

        <AlignLeft size={18} />

      </button>

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(

            INSERT_UNORDERED_LIST_COMMAND,

            undefined
          )
        }}
      >

        <List size={18} />

      </button>

      <button

        style={buttonStyle}

        onClick={() => {

          editor.dispatchCommand(

            INSERT_ORDERED_LIST_COMMAND,

            undefined
          )
        }}
      >

        <ListOrdered size={18} />

      </button>

    </div>
  )
}

export default Toolbar