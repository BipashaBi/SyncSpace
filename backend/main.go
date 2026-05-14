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

type Room struct {
	Clients map[*websocket.Conn]bool
	Mutex   sync.Mutex
}

type Message struct {
	Type    string      `json:"type"`
	Content interface{} `json:"content,omitempty"`
	Count   int         `json:"count,omitempty"`
}

var rooms = make(map[string]*Room)

func getRoom(roomID string) *Room {

	if room, exists := rooms[roomID]; exists {
		return room
	}

	room := &Room{
		Clients: make(map[*websocket.Conn]bool),
	}

	rooms[roomID] = room

	return room
}

func handleConnections(
	w http.ResponseWriter,
	r *http.Request,
) {

	roomID := r.URL.Query().Get("room")

	if roomID == "" {
		roomID = "default"
	}

	ws, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Println(err)
		return
	}

	defer ws.Close()

	room := getRoom(roomID)

	room.Mutex.Lock()
	room.Clients[ws] = true
	room.Mutex.Unlock()

	fmt.Println("Client connected to room:", roomID)

	broadcastUserCount(room)

	for {

		_, rawMsg, err := ws.ReadMessage()

		if err != nil {

			fmt.Println("Client disconnected")

			room.Mutex.Lock()
			delete(room.Clients, ws)
			room.Mutex.Unlock()

			broadcastUserCount(room)

			break
		}

		var message Message

		err = json.Unmarshal(rawMsg, &message)

		if err != nil {

			fmt.Println("Invalid message")

			continue
		}

		fmt.Println(
			"Received message:",
			message.Type,
			message.Content,
		)

		broadcast(room, ws, rawMsg)
	}
}

func broadcast(
	room *Room,
	sender *websocket.Conn,
	message []byte,
) {

	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	for client := range room.Clients {

		if client != sender {

			err := client.WriteMessage(
				websocket.TextMessage,
				message,
			)

			if err != nil {

				client.Close()

				delete(room.Clients, client)
			}
		}
	}
}

func broadcastUserCount(room *Room) {

	count := len(room.Clients)

	message := Message{
		Type:  "users",
		Count: count,
	}

	jsonMsg, _ := json.Marshal(message)

	for client := range room.Clients {

		err := client.WriteMessage(
			websocket.TextMessage,
			jsonMsg,
		)

		if err != nil {

			client.Close()

			delete(room.Clients, client)
		}
	}
}

func saveDocument(
	w http.ResponseWriter,
	r *http.Request,
) {

	// FIX: Decode into a plain map first so nothing gets lost
	// when Content is a nested JSON object (Lexical editor state).
	// Decoding into the Document struct with interface{} works too,
	// but using a raw map removes any struct-tag ambiguity.
	var body map[string]interface{}

	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
		fmt.Println("Decode error:", err)
		http.Error(w, err.Error(), 400)
		return
	}

	roomID, _ := body["roomId"].(string)
	title, _ := body["title"].(string)
	content := body["content"] // interface{} — preserves the full nested object

	fmt.Println("Save request — roomId:", roomID)
	fmt.Println("Save request — title:", title)
	fmt.Println("Save request — content nil?", content == nil)

	if roomID == "" {
		http.Error(w, "roomId is required", 400)
		return
	}

	collection := mongoClient.
		Database("google_docs").
		Collection("documents")

	filter := bson.M{
		"roomId": roomID,
	}

	// FIX: Use upsert:true so a single operation handles both
	// insert (new doc) and update (existing doc) correctly.
	// Your old code did UpdateOne then a separate InsertOne, which
	// could race and also never set roomId on the inserted doc.
	upsertOpts := options.Update().SetUpsert(true)

	update := bson.M{
		"$set": bson.M{
			"roomId":    roomID,
			"title":     title,
			"content":   content,
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(
		context.TODO(),
		filter,
		update,
		upsertOpts,
	)

	if err != nil {
		fmt.Println("MongoDB save error:", err)
		http.Error(w, err.Error(), 500)
		return
	}

	fmt.Println("Matched:", result.MatchedCount,
		"| Modified:", result.ModifiedCount,
		"| Upserted:", result.UpsertedCount)

	w.Write([]byte("saved"))
}

func loadDocument(
	w http.ResponseWriter,
	r *http.Request,
) {

	roomID := r.URL.Query().Get("roomId")

	fmt.Println("Load request — roomId:", roomID)

	collection := mongoClient.
		Database("google_docs").
		Collection("documents")

	filter := bson.M{
		"roomId": roomID,
	}

	// FIX: Decode into bson.M (raw map) instead of the Document
	// struct. When Content is a nested BSON document, decoding into
	// interface{} on the struct can produce bson.D (ordered array of
	// key-value pairs) instead of map[string]interface{}, which the
	// frontend can't use. A raw map decodes content correctly.
	var doc bson.M

	err := collection.FindOne(
		context.TODO(),
		filter,
	).Decode(&doc)

	if err != nil {
		fmt.Println("Load error:", err)
		http.Error(w, "Document not found", 404)
		return
	}

	// Convert ObjectID to string so JSON encoding doesn't break
	if oid, ok := doc["_id"].(interface{}); ok {
		doc["id"] = fmt.Sprintf("%v", oid)
		delete(doc, "_id")
	}

	fmt.Println("Loaded doc — title:", doc["title"])
	fmt.Println("Loaded doc — content nil?", doc["content"] == nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(doc)
}

func enableCors(
	next http.HandlerFunc,
) http.HandlerFunc {

	return func(
		w http.ResponseWriter,
		r *http.Request,
	) {

		w.Header().Set(
			"Access-Control-Allow-Origin",
			"*",
		)

		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type",
		)

		w.Header().Set(
			"Access-Control-Allow-Methods",
			"GET, POST, OPTIONS",
		)

		if r.Method == "OPTIONS" {
			return
		}

		next(w, r)
	}
}

func getDocuments(
	w http.ResponseWriter,
	r *http.Request,
) {

	collection := mongoClient.
		Database("google_docs").
		Collection("documents")

	cursor, err := collection.Find(
		context.TODO(),
		bson.M{},
	)

	if err != nil {

		http.Error(
			w,
			err.Error(),
			500,
		)

		return
	}

	var documents []bson.M

	err = cursor.All(
		context.TODO(),
		&documents,
	)

	if err != nil {

		http.Error(
			w,
			err.Error(),
			500,
		)

		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(documents)
}

func main() {

	connectMongo()

	http.HandleFunc(
		"/ws",
		enableCors(handleConnections),
	)

	http.HandleFunc(
		"/save",
		enableCors(saveDocument),
	)

	http.HandleFunc(
		"/load",
		enableCors(loadDocument),
	)

	http.HandleFunc(
		"/documents",
		enableCors(getDocuments),
	)

	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	fmt.Println("WebSocket server running on :" + port)

	err := http.ListenAndServe(
		":"+port,
		nil,
	)

	if err != nil {
		log.Fatal(err)
	}

	if err != nil {
		log.Fatal(err)
	}
}
