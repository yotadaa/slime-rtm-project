const { WebSocket, WebSocketServer } = require('ws');
const http = require('http');
const uuidv4 = require('uuid').v4;

const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = 8000;

server.listen(port, () => {
    console.log(`WebSocket server is running on port ${port}`);
});

const clients = {};
const users = {};
let chats = [];

function broadcastMessage(json) {
    for (let userId in clients) {
        let client = clients[userId];
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ ...json, yourId: userId }));
        }
    }

}

function removeKeysFromObject(obj, keysToDelete) {
    const newObj = { ...obj };
    keysToDelete.forEach(key => {
        delete newObj[key];
    });
    return newObj;
}

function handleMessage(message, userId) {
    const dataFromClient = JSON.parse(message.toString());
    const json = {
        type: dataFromClient.type
    };
    if (dataFromClient.type === "new") {
        users[userId] = dataFromClient.user;
        users[userId].id = userId;
    } else if (dataFromClient.type === "moving") {
        const user = dataFromClient.user;
        users[userId] = user;
    } else if (dataFromClient.type === "chat") {
        const chat = {
            ...dataFromClient.message,
            id: userId
        }
        chats = [...chats, chat]
        // message = [...message, chat];

    }
    json["users"] = users;
    json["id"] = userId;
    json["message"] = chats;

    broadcastMessage({
        ...json,
        client: users[userId]
    });
}

function handleDisconnect(userId) {
    delete clients[userId];
    delete users[userId];
    if (Object.keys(users).length === 0) {
        chats = [];
    }
    const json = { users, chats };
    broadcastMessage(json);
}

wsServer.on('connection', function (connection) {
    const userId = uuidv4();
    let date = new Date();
    console.log(`[${date.toISOString()}]: ${userId} connected to the server`);
    clients[userId] = connection;
    connection.on('message', (message) => handleMessage(message, userId));
    connection.on('close', () => handleDisconnect(userId));
});