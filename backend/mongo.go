package main

import (
	"context"
	"errors"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoClient *mongo.Client
	dbName      string
)

var errMissingMongoURI = errors.New("MONGO_URI environment variable not set")

const (
	defaultDBName      = "syncspace"
	documentCollection = "documents"
)

func documents() *mongo.Collection {
	return mongoClient.Database(dbName).Collection(documentCollection)
}

func connectMongo(ctx context.Context) error {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		return errMissingMongoURI
	}

	dbName = os.Getenv("MONGO_DB")
	if dbName == "" {
		dbName = defaultDBName
	}

	connectCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(connectCtx, options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}

	if err := client.Ping(connectCtx, nil); err != nil {
		return err
	}

	mongoClient = client

	indexCtx, indexCancel := context.WithTimeout(ctx, 10*time.Second)
	defer indexCancel()

	_, err = documents().Indexes().CreateOne(indexCtx, mongo.IndexModel{
		Keys:    bson.D{{Key: "roomId", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	log.Printf("connected to MongoDB (database %q)", dbName)
	return nil
}
