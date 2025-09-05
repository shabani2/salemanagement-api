"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = void 0;
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
  "https://agricap-ui-429dded64762.herokuapp.com",
  "https://www.agrecavente.online",
  "https://inaf-vente.netlify.app",
];
exports.corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true); // autoriser Postman ou curl sans origin
    }
    const cleanedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(cleanedOrigin)) {
      console.log(`✅ CORS autorisé pour : ${cleanedOrigin}`);
      return callback(null, true);
    } else {
      console.warn(`❌ CORS bloqué pour : ${origin}`);
      return callback(new Error(`CORS: origine non autorisée -> ${origin}`));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // important si tu utilises cookies ou sessions
};
