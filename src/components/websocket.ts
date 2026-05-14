const socket = new WebSocket(
  "ws://localhost:8080/ws?room=room1"
)

socket.onopen = () => {
  console.log("Connected to websocket server")
}

export default socket