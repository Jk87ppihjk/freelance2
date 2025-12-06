const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis de ambiente

// Importa as configurações
const db = require('./db'); // Importa o pool de conexões (já chama testConnection)
const cloudinary = require('./cloudinary'); // Importa a configuração do cloudinary
const routes = require('./routes'); // Importa as rotas

const app = express();
const PORT = process.env.PORT || 8080;

// --- Configuração de Middlewares ---

// CORS: Libera o acesso para todos os domínios
// Isso atende ao seu requisito de "cors liberado para todos os dominios"
app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Body Parser: Permite que o Express leia JSON do corpo das requisições
app.use(express.json());

// --- Rotas ---
app.use('/api', routes);

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
