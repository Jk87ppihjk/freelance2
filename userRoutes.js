// Arquivo: jk87ppihjk/freelance2/freelance2-63ad874285adb5008f7c6349998dd32f6e0da0dd/userRoutes.js

const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware');
require('dotenv').config();

// --------------------------------------------------
// 1. Rota "Me" (Perfil do Usuário Logado) - GET /api/users/me
// --------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
    const userId = req.user.id; // Pega o ID do token JWT

    try {
        // Busca os dados do usuário no banco
        const [users] = await db.query(
            'SELECT id, name, email, bio, location, job_title, skills, profile_picture_url FROM users WHERE id = ?', 
            [userId]
        );
        const user = users[0];

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Define valores padrão se os campos estiverem nulos (para evitar quebras no frontend)
        if (!user.bio) user.bio = "Editor de vídeo apaixonado por contar histórias.";
        if (!user.location) user.location = "São Paulo, Brasil";
        if (!user.job_title) user.job_title = "Freelancer";
        if (!user.skills) user.skills = JSON.stringify(["Edição", "Motion"]); // Garante formato JSON
        if (!user.profile_picture_url) user.profile_picture_url = "https://via.placeholder.com/150";

        res.json(user);

    } catch (error) {
        console.error('Erro ao buscar perfil (/me):', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar seu perfil.' });
    }
});

// --------------------------------------------------
// 2. Rota para Perfil Público de Outro Usuário - GET /api/users/profile/:userId
// --------------------------------------------------
router.get('/profile/:userId', authMiddleware, async (req, res) => {
    const targetUserId = req.params.userId;
    
    if (!targetUserId) {
        return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
    }

    try {
        // 1. Buscar Dados do Usuário (Perfil)
        const [users] = await db.query(
            'SELECT id, name, email, bio, location, job_title, skills, profile_picture_url FROM users WHERE id = ?', 
            [targetUserId]
        );
        const userProfile = users[0];

        if (!userProfile) {
            return res.status(404).json({ message: 'Perfil não encontrado.' });
        }
        
        // Defaults
        if (!userProfile.bio) userProfile.bio = "";
        if (!userProfile.skills && typeof userProfile.skills !== 'string') userProfile.skills = "[]"; 

        // 2. Buscar Posts desse usuário (para exibir no perfil dele)
        const [posts] = await db.query(
            'SELECT id, title, thumbnail_url, description FROM posts WHERE user_id = ? AND visibility = "public" ORDER BY created_at DESC', 
            [targetUserId]
        );
        
        res.json({
            profile: userProfile,
            posts: posts
        });

    } catch (error) {
        console.error('Erro ao buscar perfil público:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao carregar o perfil.' });
    }
});

module.exports = router;
