import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "expedientes.json");

// Helper to load data
const loadData = () => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch (e) {
      console.error("Error loading data file", e);
      return [];
    }
  }
  return [];
};

// Helper to save data
const saveData = (data: any) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${DATA_FILE}. Total records: ${data.length}`);
  } catch (e) {
    console.error("Error saving data file", e);
  }
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true,
    transports: ["polling", "websocket"],
    connectTimeout: 45000,
  });

  let expedientes = loadData();

  io.on("connection", (socket) => {
    console.log(`[Socket] Nuevo cliente conectado: ${socket.id} desde ${socket.handshake.address}`);
    console.log(`[Socket] Total clientes activos: ${io.engine.clientsCount}`);

    // Send initial state
    socket.emit("init", expedientes);

    // Handle updates
    socket.on("update_expedientes", (newExpedientes) => {
      console.log(`[Socket] Actualización recibida de ${socket.id}. Registros: ${newExpedientes.length}`);
      expedientes = newExpedientes;
      saveData(expedientes);
      // Broadcast to all other clients
      socket.broadcast.emit("sync_expedientes", expedientes);
    });

    // Handle manual sync request
    socket.on("get_latest", () => {
      console.log(`[Socket] Sincronización manual solicitada por ${socket.id}`);
      socket.emit("sync_expedientes", expedientes);
    });

    socket.on("error", (err) => {
      console.error(`[Socket] Error en socket ${socket.id}:`, err);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}. Razón: ${reason}`);
      console.log(`[Socket] Clientes restantes: ${io.engine.clientsCount}`);
    });
  });

  // API routes
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "ok",
      clients: io.engine.clientsCount,
      dataCount: expedientes.length 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
