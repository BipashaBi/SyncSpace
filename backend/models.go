package main

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Document struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	RoomID    string             `bson:"roomId"        json:"roomId"`
	Title     string             `bson:"title"         json:"title"`
	Content   interface{}        `bson:"content"       json:"content"`
	UpdatedAt time.Time          `bson:"updatedAt"     json:"updatedAt"`
}

type DocumentSummary struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	RoomID    string             `bson:"roomId"        json:"roomId"`
	Title     string             `bson:"title"         json:"title"`
	UpdatedAt time.Time          `bson:"updatedAt"     json:"updatedAt"`
}

type SaveRequest struct {
	RoomID  string      `json:"roomId"`
	Title   string      `json:"title"`
	Content interface{} `json:"content"`
}
