
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { sequelize, testConnection } = require('./config/database');
const { verifyToken } = require('./middleware/auth');
require('./models'); // Esto carga todos los modelos

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();
const PORT = process.env.PORT || 5000;
const FALLBACK_PORT = 5001; // Puerto alternativo si 5000 está en uso

// Middlewares
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const jobRoutes = require('./routes/job.routes');
const chatRoutes = require('./routes/chat.routes');

// Definir rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
// Para las rutas de chat aplicamos el middleware de autenticación a nivel de router
app.use('/api/chats', chatRoutes);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Crear el servidor HTTP
const server = http.createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Importar controladores de Socket.IO
const { initSocket } = require('./controllers/socket.controller');
initSocket(io);

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    const isConnected = await testConnection();
    
    if (isConnected) {
      // Sincronizar modelos con la base de datos
      // Cambiamos a force:false para mantener datos existentes
      await sequelize.sync({ force: false });
      console.log('Modelos sincronizados con la base de datos.');
      
      // Iniciar el servidor HTTP con manejo de puerto ocupado
      try {
        await new Promise((resolve, reject) => {
          server.listen(PORT, () => {
            console.log(`Servidor iniciado en el puerto ${PORT}`);
            resolve();
          });
          
          server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
              console.warn(`Puerto ${PORT} en uso. Intentando con puerto alternativo ${FALLBACK_PORT}...`);
              server.listen(FALLBACK_PORT, () => {
                console.log(`Servidor iniciado en el puerto alternativo ${FALLBACK_PORT}`);
                // Actualizar .env con el nuevo puerto para futuros inicios
                console.log('IMPORTANTE: Actualiza el archivo .env con el nuevo puerto para evitar este problema en el futuro.');
                resolve();
              });
            } else {
              reject(e);
            }
          });
        });
      } catch (error) {
        console.error('Error al iniciar el servidor HTTP:', error);
        process.exit(1);
      }
    } else {
      console.error('No se pudo iniciar el servidor debido a errores de conexión a la DB.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
