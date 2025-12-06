const express = require('express');
const cors = require('cors');
require('dotenv').config(); 

// --- Configurações/Importações de Módulos ---
// NOTA: Estes arquivos (db.js, cloudinary.js, etc.) devem estar na mesma pasta ou no caminho correto.
const db = require('./db'); 
const cloudinary = require('./cloudinary'); 
const publicRoutes = require('./routes');
const authRoutes = require('./authRoutes'); 
const postRoutes = require('./postRoutes');
const userRoutes = require('./userRoutes'); // ⬅️ IMPORTAÇÃO ESSENCIAL PARA ROTAS DE PERFIL

const app = express();
// Usa a porta definida no .env (como 8080) ou a padrão do ambiente (como 3000 na Render)
const PORT = process.env.PORT || 8080; 

// --- Configuração de Middlewares ---

// CORS: Permite que seu frontend (em outro domínio) acesse o backend
app.use(cors({
    origin: '*', // Permite qualquer origem (em produção, mude para o domínio do seu frontend)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Body Parser: Permite que o Express leia JSON e dados de formulário
app.use(express.json());
// Para lidar com dados de formulários simples (necessário para alguns uploads)
app.use(express.urlencoded({ extended: true }));


// --- Configuração de Rotas ---

// Rotas públicas (ex: Status/Saúde do servidor)
app.use('/api', publicRoutes);

// Rotas de Autenticação (Login/Cadastro)
app.use('/api/auth', authRoutes); 

// Rotas de Posts (Criação, Feed, Curtir, Comentar, Deletar)
app.use('/api/posts', postRoutes);

// Rotas de Usuário/Perfil (Buscar Perfil, /me, Edição de Perfil e Foto)
app.use('/api/users', userRoutes); // ⬅️ LINHA DE USO ESSENCIAL PARA RESOLVER O ERRO 404


// Rota de Fallback para 404 (Tratamento de rotas não encontradas)
app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada.' });
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
