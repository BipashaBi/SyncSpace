package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var mongoClient *mongo.Client

func connectMongo() {

	mongoURI := os.Getenv(
		"MONGO_URI",
	)

	if mongoURI == "" {

		panic(
			"MONGO_URI environment variable not set",
		)
	}

	clientOptions := options.Client().
		ApplyURI(mongoURI)

	client, err := mongo.Connect(

		context.TODO(),

		clientOptions,
	)

	if err != nil {
		panic(err)
	}

	ctx, cancel := context.WithTimeout(

		context.Background(),

		10*time.Second,
	)

	defer cancel()

	err = client.Ping(ctx, nil)

	if err != nil {
		panic(err)
	}

	fmt.Println(
		"Connected to MongoDB",
	)

	mongoClient = client
}
