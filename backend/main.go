package main

import (
	"context"
	"encoding/json"
	"fmt"
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

// Client owns its connection. All writes go through Send —
// a single writer goroutine per client — because gorilla/websocket
// does not allow concurrent writes on one connection.
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

// FIX: the rooms map itself needs a lock. Previously two clients
// connecting at once could write to this map concurrently, which
// panics and kills the whole server.
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

	// Re-check: another goroutine may have created it between locks.
	if room, exists := rooms[roomID]; exists {
		return room
	}

	room = &Room{
		Clients: make(map[*Client]bool),
	}
	rooms[roomID] = room
	return room
}

// removeClient detaches a client from a room and deletes the room
// if it's now empty (previously rooms leaked forever).
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
			// Re-check emptiness under the room lock to avoid
			// deleting a room that just gained a client.
			room.Mutex.Lock()
			if len(room.Clients) == 0 {
				delete(rooms, roomID)
			}
			room.Mutex.Unlock()
		}
		roomsMutex.Unlock()
	}
}

// writePump is the ONLY place that writes to a connection.
// It also sends periodic pings so idle connections aren't
// silently dropped by the host's proxy.
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
		// Buffered: broadcast never blocks on a slow client.
		Send: make(chan []byte, 256),
	}

	room := getRoom(roomID)

	room.Mutex.Lock()
	room.Clients[client] = true
	room.Mutex.Unlock()

	go client.writePump()

	log.Println("Client connected to room:", roomID)
	broadcastUserCount(room)

	// Keep the connection alive as long as pongs arrive.
	ws.SetReadDeadline(time.Now().Add(90 * time.Second))
	ws.SetPongHandler(func(string) error {
		ws.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	defer func() {
		removeClient(roomID, room, client)
		ws.Close()
		broadcastUserCount(room)
		log.Println("Client disconnected from room:", roomID)
	}()

	for {
		_, rawMsg, err := ws.ReadMessage()
		if err != nil {
			return
		}

		var message Message
		if err := json.Unmarshal(rawMsg, &message); err != nil {
			log.Println("Invalid message")
			continue
		}

		broadcast(room, client, rawMsg)
	}
}

// FIX: broadcast no longer performs network writes while holding
// the room lock. It snapshots nothing — it just pushes into each
// client's buffered channel. A slow client can no longer block
// every other client in the room (head-of-line blocking).
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
			// Client's buffer is full — it's too slow or dead.
			// Drop it rather than stalling the room.
			delete(room.Clients, client)
			close(client.Send)
		}
	}
}

// FIX: previously read and mutated room.Clients with NO lock,
// racing against broadcast() — a panic waiting to happen. Now it
// locks, and writes go through the same per-client channel.
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
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	roomID, _ := body["roomId"].(string)
	title, _ := body["title"].(string)
	content := body["content"]

	if roomID == "" {
		http.Error(w, "roomId is required", 400)
		return
	}

	collection := mongoClient.Database("google_docs").Collection("documents")

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	upsertOpts := options.Update().SetUpsert(true)
	update := bson.M{
		"$set": bson.M{
			"roomId":    roomID,
			"title":     title,
			"content":   content,
			"updatedAt": time.Now(),
		},
	}

	if _, err := collection.UpdateOne(ctx, bson.M{"roomId": roomID}, update, upsertOpts); err != nil {
		log.Println("MongoDB save error:", err)
		http.Error(w, err.Error(), 500)
		return
	}

	w.Write([]byte("saved"))
}

func loadDocument(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("roomId")

	collection := mongoClient.Database("google_docs").Collection("documents")

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var doc bson.M
	if err := collection.FindOne(ctx, bson.M{"roomId": roomID}).Decode(&doc); err != nil {
		http.Error(w, "Document not found", 404)
		return
	}

	if oid, ok := doc["_id"]; ok {
		doc["id"] = fmt.Sprintf("%v", oid)
		delete(doc, "_id")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(doc)
}

// FIX: the homepage list previously downloaded EVERY document's
// full content. Projection returns only what the list displays.
func getDocuments(w http.ResponseWriter, r *http.Request) {
	collection := mongoClient.Database("google_docs").Collection("documents")

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	findOpts := options.Find().
		SetProjection(bson.M{
			"roomId":    1,
			"title":     1,
			"updatedAt": 1,
		}).
		SetSort(bson.M{"updatedAt": -1})

	cursor, err := collection.Find(ctx, bson.M{}, findOpts)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	var documents []bson.M
	if err := cursor.All(ctx, &documents); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	for _, doc := range documents {
		if oid, ok := doc["_id"]; ok {
			doc["id"] = fmt.Sprintf("%v", oid)
			delete(doc, "_id")
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(documents)
}

func enableCors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

		if r.Method == "OPTIONS" {
			return
		}
		next(w, r)
	}
}

// Lightweight endpoint for uptime pings / warm-up checks.
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("ok"))
}

func main() {
	connectMongo()

	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/save", enableCors(saveDocument))
	http.HandleFunc("/load", enableCors(loadDocument))
	http.HandleFunc("/documents", enableCors(getDocuments))
	http.HandleFunc("/health", healthCheck)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Server running on :" + port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}