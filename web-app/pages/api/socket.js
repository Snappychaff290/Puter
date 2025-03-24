import { Server } from "socket.io";

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Handle register event
      socket.on("register", (data) => {
        console.log("Client registered:", data);
      });

      // Handle command event
      socket.on("command", (data) => {
        console.log("Received command:", data);
        // Process the command
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }
  res.end();
};

export default SocketHandler;

export const config = {
  api: {
    bodyParser: false,
  },
};
