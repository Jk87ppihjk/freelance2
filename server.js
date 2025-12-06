const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis de ambiente

// Importa as configurações/rotas
const db = require('./db'); 
const cloudinary = require('./cloudinary'); 
const publicRoutes = require('./routes'); // Rotas gerais (como /db-test)
const authRoutes = require('./authRoutes'); // Rotas de Login/Cadastro
const postRoutes = require('./postRoutes'); // Rotas do Feed/Posts

const app = express();
const PORT = process.env.PORT || 8080;

// --- Configuração de Middlewares ---

// CORS: Libera o acesso para todos os domínios (Conforme solicitado)
app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Body Parser: Permite que o Express leia JSON do corpo das requisições
app.use(express.json());

// --- Rotas ---
app.use('/api', publicRoutes); // Ex: /api/public/status
app.use('/api/auth', authRoutes); // Ex: /api/auth/register, /api/auth/login
app.use('/api/posts', postRoutes); // Ex: /api/posts/feed

// Rota de fallback para 404
app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada.' });
});

// --- Inicialização do Servidor ---

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`======================================================`);

    // Log das variáveis de ambiente após a inicialização (conforme solicitado)
    console.log('\n--- VARIÁVEIS DE AMBIENTE INICIADAS (LOG DE DEPLOY) ---');
    console.log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'FALHOU'}`);
    console.log(`DB_HOST: ${process.env.DB_HOST}`);
    console.log(`DB_NAME: ${process.env.DB_NAME ? 'OK' : 'FALHOU'}`);
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'OK' : 'FALHOU'}`);
    console.log(`PORT: ${process.env.PORT}`);
    console.log('------------------------------------------------------\n');
});
