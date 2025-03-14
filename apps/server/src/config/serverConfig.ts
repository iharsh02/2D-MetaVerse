export const SERVER_PORT = 8080;

export const SOCKET_OPTIONS = {
  cors: {
    origin: "*", // change in prod 
    methods: ["GET", "POST"],
  },
  pingInterval: 2000,
  pingTimeout: 5000,
};

export const UPDATE_INTERVAL = 15;
export const CHAT_PROXIMITY_THRESHOLD = 50;

export const X_VELOCITY = 120;
export const Y_VELOCITY = 120;

export const MEDIA_PROXIMITY_THRESHOLD = 30;
export const MEDIA_WORKERS = 3;
export const MEDIASOUP_WORKERS = 3;
export const MEDIASOUP_PROXIMITY_THRESHOLD = 50;
export const MEDIASOUP_LISTEN_IP = '127.0.0.1';