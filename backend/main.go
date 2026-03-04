package main

import (
	"context"
	"encoding/json"
	"fmt"
	//"io/ioutil"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive" // Fixed this
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- GLOBALS ---
var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
var client *mongo.Client
var db *mongo.Database
var activityCollection *mongo.Collection

// --- MODELS ---
type UserIntent struct {
	UserID    string    `json:"user_id" bson:"user_id"`
	PlaceID   string    `json:"place_id" bson:"place_id"`
	PlaceName string    `json:"place_name" bson:"place_name"`
	GoTime    time.Time `json:"go_time" bson:"go_time"`
}
type User struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"`
	UserID     string             `json:"user_id" bson:"user_id"`
	TrustScore int                `json:"trust_score" bson:"trust_score"`
	Reports    int                `json:"reports" bson:"reports"`
}
type UserProfile struct {
	UserID     string `json:"user_id"`
	TrustScore int    `json:"trust_score"`
	Meetups    int    `json:"meetups_attended"`
	Status     string `json:"status"` // "Verified", "Neutral", or "Flagged"
}

// --- NEW TRUST LOGIC ---
func UpdateTrust(userID string, scoreDelta int, reportDelta int) {
	filter := bson.M{"user_id": userID}
	update := bson.M{
		"$inc": bson.M{
			"trust_score": scoreDelta,
			"reports":     reportDelta,
		},
	}
	opts := options.Update().SetUpsert(true)
	db.Collection("users").UpdateOne(context.TODO(), filter, update, opts)
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

type Hub struct {
	roomId    string
	clients   map[*Client]bool
	broadcast chan []byte
	register  chan *Client
	unregister chan *Client
}

var hubs = make(map[string]*Hub)
var hubMutex sync.Mutex

// --- HUB LOGIC ---
func getHub(roomId string) *Hub {
	hubMutex.Lock()
	defer hubMutex.Unlock()
	if hubs[roomId] == nil {
		hubs[roomId] = &Hub{
			roomId:     roomId,
			clients:    make(map[*Client]bool),
			broadcast:  make(chan []byte),
			register:   make(chan *Client),
			unregister: make(chan *Client),
		}
		go hubs[roomId].run()
	}
	return hubs[roomId]
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				client.send <- message
			}
		}
	}
}

// --- HANDLERS ---

func getHotspots(w http.ResponseWriter, r *http.Request) {
	lat := r.URL.Query().Get("lat")
	lon := r.URL.Query().Get("lon")
	osmQuery := fmt.Sprintf(`[out:json];node(around:5000,%s,%s)[amenity~"cafe|pub|community_centre|library|park|university"];out;`, lat, lon)
	overpassURL := "https://overpass-api.de/api/interpreter?data=" + osmQuery
	
	resp, _ := http.Get(overpassURL)
	defer resp.Body.Close()
	
	var osmData struct {
		Elements []map[string]interface{} `json:"elements"`
	}
	json.NewDecoder(resp.Body).Decode(&osmData)

	// 🪄 THE MAGIC: Add visitor counts from MongoDB to each marker
	for i, element := range osmData.Elements {
		id := fmt.Sprintf("%v", element["id"])
		count, _ := db.Collection("active_meetups").CountDocuments(context.TODO(), bson.M{"place_id": id})
		osmData.Elements[i]["visitor_count"] = count
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(osmData)
}

func joinHotspot(w http.ResponseWriter, r *http.Request) {
	var intent UserIntent
	json.NewDecoder(r.Body).Decode(&intent)
	intent.GoTime = time.Now()
	activityCollection.InsertOne(context.TODO(), intent)
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Joined %s", intent.PlaceName)
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	roomId := r.URL.Query().Get("room")
	if roomId == "" { roomId = "global" }
	conn, _ := upgrader.Upgrade(w, r, nil)
	hub := getHub(roomId)
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
	client.hub.register <- client

	go func() {
		for msg := range client.send {
			conn.WriteMessage(websocket.TextMessage, msg)
		}
	}()

	// Inside your WebSocket Read loop
	// Inside handleWS for loop
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// Get user and room from the query params (defined at top of handleWS)
		uID := r.URL.Query().Get("user")

		if isScam(string(msg)) {
			fmt.Printf("🚫 Scam detected from %s! Blocking.\n", uID)
			UpdateTrust(uID, -50, 1) // Deduct 50 points
			conn.WriteMessage(websocket.TextMessage, []byte("SYSTEM: Message blocked. Trust penalized. 🛡️"))
			continue 
		}

		// Broadcast to the hub we found at the start of handleWS
		hub.broadcast <- msg
	}
}
func getProfile(w http.ResponseWriter, r *http.Request) {
	uID := r.URL.Query().Get("user_id")
    var user User
    err := db.Collection("users").FindOne(context.TODO(), bson.M{"user_id": uID}).Decode(&user)
    
    if err != nil {
        // 🛡️ START AT 50, NOT 0
        user = User{UserID: uID, TrustScore: 50, Reports: 0}
        db.Collection("users").InsertOne(context.TODO(), user)
    }

	// Calculate status for the frontend
	status := "Neutral"
	if user.TrustScore > 80 { status = "Verified ✅" }
	if user.TrustScore < 30 { status = "Suspicious ⚠️" }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id":     user.UserID,
		"trust_score": user.TrustScore,
		"status":      status,
		"meetups":     5, // Hardcoded for now until we query activityCollection
	})
}
func upvotePost(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("id")
	objID, _ := primitive.ObjectIDFromHex(postID)
	filter := bson.M{"_id": objID}
	update := bson.M{"$inc": bson.M{"upvotes": 1}}
	db.Collection("forums").UpdateOne(context.TODO(), filter, update)
	fmt.Fprintf(w, "Upvoted! 🔺")
}

func isScam(message string) bool {
	scamKeywords := []string{"otp", "money", "paytm", "gpay", "urgent", "bank", "crypto", "transfer"}
	messageLower := strings.ToLower(message)
	for _, word := range scamKeywords {
		if strings.Contains(messageLower, word) {
			return true
		}
	}
	return false
}
func getSafetyColor(averageTrust int) string {
    if averageTrust >= 70 { return "green" }
    if averageTrust >= 40 { return "orange" }
    return "red"
}
func processMessage(userID string, message string) {
    if isScam(message) {
        fmt.Printf("⚠️ SCAM DETECTED from user %s\n", userID)
        // Instant massive penalty
        UpdateTrust(userID, 0, 2) // Simulating 2 heavy reports for scamming
    }
}

func handleJoin(w http.ResponseWriter, r *http.Request) {
    var req struct {
        UserID  string `json:"user_id"`
        PlaceID string `json:"place_id"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    // 1. Fetch user from Mongo
    var user User
    err := db.Collection("users").FindOne(context.TODO(), bson.M{"user_id": req.UserID}).Decode(&user)
    
    // 2. Bonus: If user is verified, give them a +2 trust bump for being active
    if err == nil {
        UpdateTrust(req.UserID, 2, 0) // 2 points for joining a meetup
    }

    // 3. Log the intent to the 'active_meetups' collection
    db.Collection("active_meetups").InsertOne(context.TODO(), req)
    
    w.Write([]byte("Joined! Your trust score is growing. 📈"))
}

func initDB() {
	c, _ := mongo.Connect(context.TODO(), options.Client().ApplyURI("mongodb://localhost:27017"))
	db = c.Database("unAloneDB")
	activityCollection = db.Collection("activity")
	fmt.Println("✅ DB, Hubs, and Scam Filter Online")
}

func main() {
	initDB()
	http.HandleFunc("/hotspots", getHotspots)
	http.HandleFunc("/join", joinHotspot)
	http.HandleFunc("/ws", handleWS)
	http.HandleFunc("/upvote", upvotePost)
	http.HandleFunc("/profile", getProfile)
	fmt.Println("🚀 unAlone Final Day 1 Server at :8080")
	log.Fatal(http.ListenAndServe("0.0.0.0:8080", nil))
}
