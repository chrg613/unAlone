unAlone: Version 1.0
The Trust-Based Social Discovery App

unAlone is a real-time social platform designed to help users find physical "hotspots" (cafes, libraries, parks) to hang out. It features a custom Trust Identity System that uses a Go-based backend to monitor chat rooms for scams and penalize bad actors automatically.


Project Architecture
The project is split into two main directories:

/backend: Go (Golang) server handling WebSockets, MongoDB interactions, and Scam Detection logic.

/mobile: React Native (TypeScript) application using react-native-maps and react-navigation.

1. Backend Setup (Go & MongoDB)
Prerequisites
Go: Installed on your Mac.

MongoDB: Running locally on mongodb://localhost:27017.

Dependencies: Run go mod tidy in the /backend folder.

Running the Server
Navigate to the backend folder: cd backend

Start the server: go run main.go

Note: Ensure your Mac's Firewall allows incoming connections on port 8080.

2. Mobile Setup (React Native)
Prerequisites
Node.js: Recommended v20 or higher.

Watchman: brew install watchman

CocoaPods: Required for iOS.

Initial Installation
Navigate to the mobile app: cd mobile/unAloneMobile

Install JS packages: npm install

Install iOS dependencies: cd ios && pod install && cd ..

Setting up the Xcode Simulator
If you don't have a simulator running:

Open Xcode.

Go to Settings (Cmd + ,) > Platforms.

Ensure an iOS version is downloaded.

Go to Xcode Menu > Open Developer Tool > Simulator.

Pro Tip: To free up space later, delete Derived Data at ~/Library/Developer/Xcode/DerivedData.

Running the App
Ensure your Go backend is running.

In the unAloneMobile folder, run: npx react-native run-ios

3. Core Features & Logic
The Scam Filter
The backend monitors all WebSocket traffic. If a message contains blacklisted keywords (e.g., "OTP", "Bank", "Transfer"), the following happens:

The message is blocked.

The user's Trust Score is instantly deducted by 50 points.

The user's identity status updates to "Suspicious" or "Neutral" in the Identity Tab.

The Map & Joining
Long Press: Tap and hold anywhere on the map to create a Custom Meetup Point.

Join: Clicking "I'm Planning to Go" sends a POST request to the backend to track the "Heat" (visitor count) of that location.

4. Maintenance & Storage
To keep this project lightweight on your pendrive:

Skip node_modules: These are excluded via .gitignore. Run npm install to recreate them.

Skip ios/Pods: Run pod install in the ios folder to recreate them.

Clean Build: If the app crashes, run rm -rf ios/build and restart.
