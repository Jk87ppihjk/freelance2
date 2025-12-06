const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware'); // Middleware para proteger a rota

// --- Rota para o Feed Principal (GET /api/posts/feed) ---
// Esta rota requer autenticação JWT
router.get('/feed', authMiddleware, async (req, res) => {
    try {
        // user_id e outros dados do usuário estão disponíveis em req.user após o authMiddleware
        const userId = req.user.id;
        
        // Query para buscar posts recentes, unindo com a tabela de usuários
        const [posts] = await db.query(`
            SELECT 
                p.id, p.title, p.description, p.video_url, p.thumbnail_url, p.likes, p.views, 
                u.name as user_name, u.email as user_email
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        // Se o banco de dados estiver vazio, retornamos dados simulados para não quebrar o frontend
        if (posts.length === 0) {
            return res.json({
                message: 'Nenhum post encontrado. Retornando dados simulados.',
                posts: [
                    { id: 99, title: 'Mock Post: UI Design', description: 'Simulação de um projeto de UI/UX moderno.', video_url: '/mock-video.mp4', thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdlK2AyLaomJqgKJ1_-cz0pkDuB2x2MsT3P3vcgdJgRitjU81BiatpPASCihiVYipBtij4eFQUFezTwewTtieCgpRL_ovSdmGmpNE4iYC7-cZ8E0QjA5aiRVxkpGO2kxOlBZ3JxZyCTQg84eK7NCu4hXv0VJB7klB1jG3OeKFEAM5sdH66OtspgynmLpF28QuMs7W2V36JilmWxAiL1JY_9lPAZmtn5zCPUqxoZMwjscTjqlsw0qBOASqd8cvsIhKrP0yUFcChIVAs', likes: 120, views: 500, user_name: 'Dev Teste', user_email: 'dev@teste.com' },
                    { id: 98, title: 'Mock Post: Frontend Dinâmico', description: 'Exemplo de animações em React.', video_url: '/mock-video-2.mp4', thumbnail_url: 'https://lh3.googleusercontent.com/aida-', likes: 85, views: 320, user_name: 'Júlia Code', user_email: 'julia@code.com' },
                ]
            });
        }
        
        res.json({ posts: posts });

    } catch (error) {
        console.error('Erro ao buscar o feed:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao carregar o feed.' });
    }
});

module.exports = router;
