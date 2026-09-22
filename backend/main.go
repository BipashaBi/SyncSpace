package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
}

type Room struct {
	Clients map[*Client]bool
	Mutex   sync.Mutex
}

type Message struct {
	Type    string      `json:"type"`
	Content interface{} `json:"content,omitempty"`
	Count   int         `json:"count,omitempty"`
}

var (
	rooms      = make(map[string]*Room)
	roomsMutex sync.RWMutex
)

func getRoom(roomID string) *Room {
	roomsMutex.RLock()
	room, exists := rooms[roomID]
	roomsMutex.RUnlock()

	if exists {
		return room
	}

	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if room, exists := rooms[roomID]; exists {
		return room
	}

	room = &Room{
		Clients: make(map[*Client]bool),
	}
	rooms[roomID] = room
	return room
}

func removeClient(roomID string, room *Room, c *Client) {
	room.Mutex.Lock()
	if _, ok := room.Clients[c]; ok {
		delete(room.Clients, c)
		close(c.Send)
	}
	empty := len(room.Clients) == 0
	room.Mutex.Unlock()

	if empty {
		roomsMutex.Lock()
		if r, ok := rooms[roomID]; ok && r == room {
			room.Mutex.Lock()
			if len(room.Clients) == 0 {
				delete(rooms, roomID)
			}
			room.Mutex.Unlock()
		}
		roomsMutex.Unlock()
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(45 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		roomID = "default"
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		Conn: ws,
		Send: make(chan []byte, 256),
	}

	room := getRoom(roomID)

	room.Mutex.Lock()
	room.Clients[client] = true
	room.Mutex.Unlock()

	go client.writePump()

	log.Println("client connected to room:", roomID)
	broadcastUserCount(room)

	ws.SetReadDeadline(time.Now().Add(90 * time.Second))
	ws.SetPongHandler(func(string) error {
		ws.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	defer func() {
		removeClient(roomID, room, client)
		ws.Close()
		broadcastUserCount(room)
		log.Println("client disconnected from room:", roomID)
	}()

	for {
		_, rawMsg, err := ws.ReadMessage()
		if err != nil {
			return
		}

		var message Message
		if err := json.Unmarshal(rawMsg, &message); err != nil {
			log.Println("discarding malformed message")
			continue
		}

		broadcast(room, client, rawMsg)
	}
}

func broadcast(room *Room, sender *Client, message []byte) {
	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	for client := range room.Clients {
		if client == sender {
			continue
		}
		select {
		case client.Send <- message:
		default:
			delete(room.Clients, client)
			close(client.Send)
		}
	}
}

func broadcastUserCount(room *Room) {
	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	message := Message{
		Type:  "users",
		Count: len(room.Clients),
	}
	jsonMsg, _ := json.Marshal(message)

	for client := range room.Clients {
		select {
		case client.Send <- jsonMsg:
		default:
			delete(room.Clients, client)
			close(client.Send)
		}
	}
}

func saveDocument(w http.ResponseWriter, r *http.Request) {
	var req SaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.RoomID == "" {
		http.Error(w, "roomId is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"roomId":    req.RoomID,
			"title":     req.Title,
			"content":   req.Content,
			"updatedAt": time.Now().UTC(),
		},
	}

	_, err := documents().UpdateOne(
		ctx,
		bson.M{"roomId": req.RoomID},
		update,
		options.Update().SetUpsert(true),
	)
	if err != nil {
		log.Println("mongo save error:", err)
		http.Error(w, "could not save document", http.StatusInternalServerError)
		return
	}

	w.Write([]byte("saved"))
}

func loadDocument(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("roomId")
	if roomID == "" {
		http.Error(w, "roomId is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var doc Document
	if err := documents().FindOne(ctx, bson.M{"roomId": roomID}).Decode(&doc); err != nil {
		http.Error(w, "document not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(doc)
}

func getDocuments(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	findOpts := options.Find().
		SetProjection(bson.D{
			{Key: "roomId", Value: 1},
			{Key: "title", Value: 1},
			{Key: "updatedAt", Value: 1},
		}).
		SetSort(bson.D{{Key: "updatedAt", Value: -1}})

	cursor, err := documents().Find(ctx, bson.M{}, findOpts)
	if err != nil {
		log.Println("mongo list error:", err)
		http.Error(w, "could not list documents", http.StatusInternalServerError)
		return
	}

	summaries := []DocumentSummary{}
	if err := cursor.All(ctx, &summaries); err != nil {
		log.Println("mongo cursor error:", err)
		http.Error(w, "could not list documents", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summaries)
}

func enableCors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

		if r.Method == http.MethodOptions {
			return
		}
		next(w, r)
	}
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("ok"))
}

func main() {
	if err := connectMongo(context.Background()); err != nil {
		log.Fatal("mongo: ", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleConnections)
	mux.HandleFunc("/save", enableCors(saveDocument))
	mux.HandleFunc("/load", enableCors(loadDocument))
	mux.HandleFunc("/documents", enableCors(getDocuments))
	mux.HandleFunc("/health", healthCheck)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("server listening on :" + port)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
