const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/signal" });

const PORT = process.env.PORT || 3000;

// roomId => { sender: WebSocket | null, viewers: Map<viewerId, WebSocket> }
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { sender: null, viewers: new Map() });
  }
  return rooms.get(roomId);
}

function safeSend(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  let role = null; // "sender" | "viewer"
  let roomId = null;
  let viewerId = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      return;
    }

    switch (msg.type) {
      case "register-sender": {
        roomId = msg.roomId;
        role = "sender";
        const room = getRoom(roomId);
        room.sender = ws;
        safeSend(ws, { type: "sender-registered", roomId });
        // Notify any connected viewers that the sender is now online.
        room.viewers.forEach((viewerSocket, id) => {
          safeSend(viewerSocket, {
            type: "sender-available",
            roomId,
            viewerId: id,
          });
        });
        break;
      }
      case "viewer-join": {
        roomId = msg.roomId;
        role = "viewer";
        viewerId = msg.viewerId;
        const room = getRoom(roomId);
        room.viewers.set(viewerId, ws);
        safeSend(ws, {
          type: "viewer-registered",
          roomId,
          viewerId,
          senderOnline: Boolean(room.sender),
        });
        if (room.sender) {
          safeSend(room.sender, {
            type: "viewer-join",
            roomId,
            viewerId,
          });
        }
        break;
      }
      case "viewer-offer": {
        const room = getRoom(msg.roomId);
        if (room.sender) {
          safeSend(room.sender, {
            type: "viewer-offer",
            roomId: msg.roomId,
            viewerId: msg.viewerId,
            sdp: msg.sdp,
          });
        }
        break;
      }
      case "viewer-ice-candidate": {
        const room = getRoom(msg.roomId);
        if (room.sender) {
          safeSend(room.sender, {
            type: "viewer-ice-candidate",
            roomId: msg.roomId,
            viewerId: msg.viewerId,
            candidate: msg.candidate,
          });
        }
        break;
      }
      case "sender-answer": {
        const room = getRoom(msg.roomId);
        const viewerSocket = room.viewers.get(msg.viewerId);
        safeSend(viewerSocket, {
          type: "sender-answer",
          roomId: msg.roomId,
          viewerId: msg.viewerId,
          sdp: msg.sdp,
        });
        break;
      }
      case "sender-ice-candidate": {
        const room = getRoom(msg.roomId);
        const viewerSocket = room.viewers.get(msg.viewerId);
        safeSend(viewerSocket, {
          type: "sender-ice-candidate",
          roomId: msg.roomId,
          viewerId: msg.viewerId,
          candidate: msg.candidate,
        });
        break;
      }
      default:
        break;
    }
  });

  ws.on("close", () => {
    if (role === "sender" && roomId) {
      const room = getRoom(roomId);
      room.sender = null;
      // Notify viewers that sender is gone.
      room.viewers.forEach((viewerSocket, id) => {
        safeSend(viewerSocket, {
          type: "sender-disconnected",
          roomId,
          viewerId: id,
        });
      });
    }
    if (role === "viewer" && roomId && viewerId) {
      const room = getRoom(roomId);
      room.viewers.delete(viewerId);
      if (room.sender) {
        safeSend(room.sender, {
          type: "viewer-left",
          roomId,
          viewerId,
        });
      }
    }
  });
});

app.use(express.static(path.join(__dirname, "public")));

server.listen(PORT, () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
