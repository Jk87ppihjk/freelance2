const express = require('express');
const router = express.Router();
const db = require('./db'); // Importa a conexão com o banco de dados
const authMiddleware = require('./authMiddleware'); // Importa o middleware de autenticação

// Rota pública de teste
router.get('/public/status', (req, res) => {
    res.json({ message: 'API está online!', timestamp: new Date() });
});

// Rota de teste para o banco de dados
router.get('/public/db-test', async (req, res) => {
    try {
        // Tenta executar uma query simples
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        res.json({ message: 'Conexão com DB OK!', solution: rows[0].solution });
    } catch (error) {
        console.error('Erro na rota /db-test:', error.message);
        res.status(500).json({ message: 'Erro ao testar o banco de dados', error: error.message });
    }
});

// Rota protegida por autenticação
router.get('/secure/profile', authMiddleware, (req, res) => {
    // Se chegou aqui, o token é válido e req.user contém os dados decodificados
    res.json({ 
        message: 'Acesso autorizado ao perfil.', 
        userData: req.user,
        info: 'Aqui você buscará os dados do perfil no DB usando req.user.id'
    });
});

module.exports = router;
