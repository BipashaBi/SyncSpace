import {
  useLexicalComposerContext
} from '@lexical/react/LexicalComposerContext'

import '../theme.css'

import Toolbar from './Toolbar'

import EditorNavbar
  from './EditorNavbar'

import {
  useRef,
  useEffect,
  useState
} from 'react'

import {
  TextNode
} from 'lexical'

import {
  OnChangePlugin
} from '@lexical/react/LexicalOnChangePlugin'

import {
  LexicalComposer
} from '@lexical/react/LexicalComposer'

import {
  RichTextPlugin
} from '@lexical/react/LexicalRichTextPlugin'

import {
  ContentEditable
} from '@lexical/react/LexicalContentEditable'

import {
  HistoryPlugin
} from '@lexical/react/LexicalHistoryPlugin'

// Base URLs come from env so local dev and production
// use the same code. See .env.local / .env.production.
const API_URL = import.meta.env.VITE_API_URL
const WS_URL = import.meta.env.VITE_WS_URL

const theme = {

  text: {

    bold: 'editor-text-bold',

    italic: 'editor-text-italic',

    underline: 'editor-text-underline'
  }
}

function Editor({
  roomId
}: {
  roomId: string
}) {

  const editorRef = useRef<any>(null)

  const isRemoteUpdate = useRef(false)

  const hasLoadedDocument = useRef(false)

  const socketRef =
    useRef<WebSocket | null>(null)

  const saveTimeoutRef =
    useRef<number | null>(null)

  const [typingUser,
    setTypingUser] =
    useState('')

  const [activeUsers,
    setActiveUsers] =
    useState(1)
  const [liveCursors,
  setLiveCursors] =
  useState<any[]>([])

  const [documentTitle,
    setDocumentTitle] =
    useState('Untitled Document')

  const [user] = useState({

    id: crypto.randomUUID(),

    name:
      'User ' +
      Math.floor(
        Math.random() * 100
      ),

    color:
      '#' +
      Math.floor(
        Math.random() * 16777215
      ).toString(16)
  })

  useEffect(() => {

    const socket = new WebSocket(
      `${WS_URL}/ws?room=${roomId}`
    )

    socketRef.current = socket

    socket.onopen = () => {

      console.log(
        'Connected to websocket server'
      )
    }

    socket.onmessage = (event) => {

      let data

      try {

        data = JSON.parse(event.data)

      } catch (err) {

        console.error(
          'WebSocket parse error:',
          err
        )

        return
      }

      if (
        !hasLoadedDocument.current
      ) {
        return
      }

      if (data.type === 'typing') {

        if (
          data.user?.name !==
          user.name
        ) {

          setTypingUser(
            data.user.name
          )

          setTimeout(() => {

            setTypingUser('')

          }, 1200)
        }

        return
      }

      if (data.type === 'cursor') {

  if (
    data.user?.id !==
    user.id
  ) {

    setLiveCursors(prev => {

      const filtered =
        prev.filter(

          (cursor: any) =>

            cursor.user.id !==
            data.user.id
        )

      return [
        ...filtered,
        data
      ]
    })
  }

  return
}

      if (data.type === 'users') {

        setActiveUsers(data.count)

        return
      }

      if (data.type === 'content') {

        if (
          !data.content ||
          !data.content.root
        ) {

          console.log(
            'Invalid content received'
          )

          return
        }

        if (editorRef.current) {

          isRemoteUpdate.current =
            true

          try {

            const parsedState =
              editorRef.current.parseEditorState(
                JSON.stringify(
                  data.content
                )
              )

            editorRef.current.setEditorState(
              parsedState
            )

          } catch (err) {

            console.error(
              'Realtime parse error:',
              err
            )
          }
        }

        return
      }
    }

    return () => {
      socket.close()
    }

  }, [roomId])

  const initialConfig = {

    namespace: 'GoogleDocsClone',

    theme,

    nodes: [
      TextNode
    ],

    editorState: undefined,

    onError(error: Error) {
      throw error
    }
  }

  return (

    <LexicalComposer
      initialConfig={initialConfig}
    >

      <EditorContent

        roomId={roomId}

        editorRef={editorRef}

        hasLoadedDocument={
          hasLoadedDocument
        }

        isRemoteUpdate={
          isRemoteUpdate
        }

        socketRef={socketRef}

        saveTimeoutRef={
          saveTimeoutRef
        }

        documentTitle={
          documentTitle
        }

        setDocumentTitle={
          setDocumentTitle
        }

        activeUsers={activeUsers}

        typingUser={typingUser}

        liveCursors={liveCursors}


        user={user}

      />

    </LexicalComposer>
  )
}

function LoadDocumentPlugin({

  roomId,

  editorRef,

  hasLoadedDocument,

  isRemoteUpdate,

  setDocumentTitle

}: any) {

  const [editor] =
    useLexicalComposerContext()

  useEffect(() => {

    editorRef.current = editor

    fetch(
      `${API_URL}/load?roomId=${roomId}`
    )

      .then(res => res.json())

      .then(data => {

        if (data.title) {

          setDocumentTitle(
            data.title
          )
        }

        if (
          data.content &&
          data.content.root
        ) {

          try {

            const loadedState =
              editor.parseEditorState(
                JSON.stringify(
                  data.content
                )
              )

            isRemoteUpdate.current =
              true

            editor.setEditorState(
              loadedState
            )

          } catch (err) {

            console.error(
              'Load parse error:',
              err
            )
          }
        }

        hasLoadedDocument.current =
          true
      })

      .catch(err => {

        console.error(
          'Load error:',
          err
        )

        hasLoadedDocument.current =
          true
      })

  }, [])

  return null
}

function EditorContent({

  roomId,

  editorRef,

  hasLoadedDocument,

  isRemoteUpdate,

  socketRef,

  saveTimeoutRef,

  documentTitle,

  setDocumentTitle,

  activeUsers,

  typingUser,

  liveCursors,

  user

}: any) {

  const documentTitleRef =
    useRef(documentTitle)

  // Throttle for content broadcasts: send at most once per
  // THROTTLE_MS, with a trailing send so the final state
  // always goes out. Prevents shipping the entire document
  // on every single keystroke.
  const THROTTLE_MS = 150

  const lastContentSendRef =
    useRef(0)

  const contentSendTimeoutRef =
    useRef<number | null>(null)

  const sendContent = (
    editorJSON: any
  ) => {

    const message = JSON.stringify({

      type: 'content',

      content: editorJSON,

      user
    })

    const now = Date.now()

    const elapsed =
      now - lastContentSendRef.current

    if (contentSendTimeoutRef.current) {

      clearTimeout(
        contentSendTimeoutRef.current
      )

      contentSendTimeoutRef.current =
        null
    }

    if (elapsed >= THROTTLE_MS) {

      lastContentSendRef.current = now

      socketRef.current?.send(message)

    } else {

      // Trailing send: fire once the window elapses,
      // carrying the latest state.
      contentSendTimeoutRef.current =
        window.setTimeout(() => {

          lastContentSendRef.current =
            Date.now()

          socketRef.current?.send(
            message
          )

        }, THROTTLE_MS - elapsed)
    }
  }

  useEffect(() => {

    documentTitleRef.current =
      documentTitle

  }, [documentTitle])

  const scheduleSave = (
    title: string,
    contentJSON?: any
  ) => {

    if (saveTimeoutRef.current) {

      clearTimeout(
        saveTimeoutRef.current
      )
    }

    saveTimeoutRef.current =
      window.setTimeout(() => {

        const content =
          contentJSON ??
          editorRef.current
            ?.getEditorState()
            .toJSON()

        if (!content) return

        fetch(
          `${API_URL}/save`,
          {

            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({

              roomId,

              title,

              content
            })
          }
        )

          .then(() => {

            console.log(
              'Document autosaved'
            )
          })

          .catch(err => {

            console.error(
              'Save error:',
              err
            )
          })

      }, 1000)
  }

  return (

    <div
      style={{
        background: '#f1f3f4',
        minHeight: '100vh'
      }}
    >

      <EditorNavbar

        documentTitle={
          documentTitle
        }

        setDocumentTitle={(
          title: string
        ) => {

          setDocumentTitle(title)

          documentTitleRef.current =
            title

          scheduleSave(title)
        }}

      />

      <div
        style={{
          paddingTop: '40px',
          paddingBottom: '60px'
        }}
      >

        <div
          style={{

            width: 'min(850px, 95vw)',

            margin: '0 auto',

            background: 'white',

            minHeight: '1100px',

            padding: 'clamp(16px, 8vw, 80px) clamp(12px, 9vw, 90px)',

            boxShadow:
              '0 1px 12px rgba(0,0,0,0.15)',

            borderRadius: '2px',

            position: 'relative'
          }}
        >

          <Toolbar />

          <div
            style={{
              height: '30px'
            }}
          />

          <RichTextPlugin

            contentEditable={
              <ContentEditable
                style={{
                  outline: 'none',
                  minHeight: '800px',
                  fontSize: '18px',
                  lineHeight: '1.8',
                  color: '#202124'
                }}
              />
            }

            placeholder={
              <div
                style={{
                  color: '#94a3b8'
                }}
              >
                Start typing
              </div>
            }

            ErrorBoundary={({
              children
            }) => children}

          />

          <HistoryPlugin />

          <div
            style={{

              marginTop: '30px',

              display: 'flex',

              alignItems: 'center',

              justifyContent:
                'space-between'
            }}
          >

            <div
              style={{

                display: 'flex',

                alignItems: 'center',

                gap: '10px'
              }}
            >

              <div
                style={{

                  width: '14px',

                  height: '14px',

                  borderRadius: '50%',

                  background: user.color
                }}
              />

              <span
                style={{
                  fontWeight: 500
                }}
              >
                {user.name}
              </span>

            </div>

            <div
              style={{

                display: 'flex',

                alignItems: 'center'
              }}
            >

              {Array.from({
                length: activeUsers
              }).map((_, index) => (

                <div

                  key={index}

                  style={{

                    width: '34px',

                    height: '34px',

                    borderRadius: '50%',

                    background:
                      `hsl(${index * 70}, 70%, 55%)`,

                    marginLeft: '-8px',

                    border:
                      '2px solid white',

                    display: 'flex',

                    alignItems: 'center',

                    justifyContent: 'center',

                    color: 'white',

                    fontWeight: 'bold',

                    fontSize: '13px'
                  }}
                >
                  {index + 1}
                </div>

              ))}

            </div>

          </div>

          {liveCursors.map(
  (cursor: any) => (

    <div

      key={cursor.user.id}

      style={{

        position: 'absolute',

        top:
          120 +
          cursor.position * 1.5,

        right: '-140px',

        display: 'flex',

        alignItems: 'center',

        gap: '6px',

        zIndex: 100
      }}
    >

      <div
        style={{

          width: '3px',

          height: '24px',

          background:
            cursor.user.color,

          borderRadius: '10px'
        }}
      />

      <div
        style={{

          background:
            cursor.user.color,

          color: 'white',

          padding:
            '4px 8px',

          borderRadius: '10px',

          fontSize: '12px',

          fontWeight: 'bold',

          whiteSpace: 'nowrap'
        }}
      >
        {cursor.user.name}
      </div>

    </div>

))}

          {typingUser && (

            <div
              style={{

                marginTop: '10px',

                color: '#94a3b8',

                fontStyle: 'italic',

                fontSize: '14px'
              }}
            >
              {typingUser} is typing
            </div>

          )}

          <LoadDocumentPlugin

            roomId={roomId}

            editorRef={editorRef}

            hasLoadedDocument={
              hasLoadedDocument
            }

            isRemoteUpdate={
              isRemoteUpdate
            }

            setDocumentTitle={
              setDocumentTitle
            }

          />
          

          <OnChangePlugin

            onChange={(
              _editorState,
              editor
            ) => {

              editorRef.current =
                editor

              if (
                !hasLoadedDocument.current
              ) {
                return
              }

              const editorJSON =
                editor
                  .getEditorState()
                  .toJSON()

              if (
                !editorJSON ||
                !editorJSON.root
              ) {
                return
              }

              if (
                isRemoteUpdate.current
              ) {

                isRemoteUpdate.current =
                  false

                return
              }

              socketRef.current?.send(
                JSON.stringify({

                  type: 'typing',

                  user
                })
              )
              const selection =
  window.getSelection()

if (
  selection &&
  selection.anchorOffset !==
    undefined
) {

  socketRef.current?.send(
    JSON.stringify({

      type: 'cursor',

      user,

      position:
        selection.anchorOffset
    })
  )
}

              sendContent(editorJSON)

              scheduleSave(
                documentTitleRef.current,

                JSON.parse(
                  JSON.stringify(
                    editorJSON
                  )
                )
              )
            }}

          />

        </div>

      </div>

    </div>
  )
}

export default Editor