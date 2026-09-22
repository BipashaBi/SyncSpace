package main

import "go.mongodb.org/mongo-driver/bson/primitive"

type Document struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`

	RoomID string `bson:"roomId" json:"roomId"`

	Title string `bson:"title" json:"title"`

	Content interface{} `bson:"content" json:"content"`
}
