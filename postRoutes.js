const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware');
const cloudinary = require('./cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configuração do Multer (mantida)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Rota de Criação de Post (POST /api/posts/create) (Mantida) ---
router.post('/create', authMiddleware, upload.single('video'), async (req, res) => {
    // ... (lógica existente de criação de post e upload para Cloudinary)
    const userId = req.user.id;
    const { title, description, tags, visibility = 'public' } = req.body;
    const videoFile = req.file;

    if (!title || !description || !videoFile) {
        return res.status(400).json({ message: 'Título, descrição e arquivo de vídeo são obrigatórios.' });
    }

    try {
        const result = await cloudinary.uploader.upload(
            `data:${videoFile.mimetype};base64,${videoFile.buffer.toString('base64')}`,
            {
                resource_type: "video",
                folder: "freelancer_posts",
                chunk_size: 6000000,
            }
        );
        
        const videoUrl = result.secure_url;
        const thumbnailUrl = result.secure_url.replace(/\.mp4$/, '.jpg').replace(/\.mov$/, '.jpg').replace(/\.webm$/, '.jpg'); 

        const tagsArray = tags ? JSON.stringify(tags.split(',').map(t => t.trim())) : '[]';

        const [dbResult] = await db.query(
            'INSERT INTO posts (user_id, title, description, video_url, thumbnail_url, tags, visibility) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, title, description, videoUrl, thumbnailUrl, tagsArray, visibility]
        );

        res.status(201).json({
            message: 'Post criado com sucesso!',
            postId: dbResult.insertId,
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl
        });

    } catch (error) {
        console.error('Erro ao processar criação de post e upload:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao criar o post.', error: error.message });
    }
});


// --- Rota para Perfil e Posts de um Usuário (GET /api/posts/profile/:userId) (Mantida) ---
router.get('/profile/:userId', authMiddleware, async (req, res) => {
    // ... (lógica existente de busca de perfil)
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
        
        // Dados simulados para o perfil se a tabela 'users' não tiver todos os campos
        if (!userProfile.bio) userProfile.bio = "Editor de vídeo apaixonado por contar histórias. Especializado em vídeos para redes sociais, com foco em conteúdo dinâmico e engajador para marcas e criadores.";
        if (!userProfile.location) userProfile.location = "São Paulo, Brasil";
        if (!userProfile.job_title) userProfile.job_title = "Editor(a) de Vídeo";
        if (!userProfile.skills) userProfile.skills = JSON.stringify(["Adobe Premiere", "Motion Graphics", "After Effects"]);
        if (!userProfile.profile_picture_url) userProfile.profile_picture_url = "https://lh3.googleusercontent.com/aida-public/AB6AXuAX6x7ogB02_IUN6VFkgzfxjSjBK3tPs2l7PGbzdMqtbxHTtxSHpSWBk5liz_aL-hYLa-Lot41BhbI28bQ1HL0yvUFTB3Hp2dUztUcun6juA5Gbf8vE1Ujd3sccShjP7HpbfzU1meivQPkVJhXU5o5XJbiMJFX148wu0NRY31S7mfqZlvewZId4GCnKznPdFFat0X3rUPYgl7y6z5gW5qeoQ85zgDxCHWtWTCYFT43TUGa-_NKGmqtaGJPd-zkjrSbXDTUG9djotOKF";


        // 2. Buscar Posts do Usuário
        const [posts] = await db.query(
            'SELECT id, title, thumbnail_url FROM posts WHERE user_id = ? AND visibility = "public" ORDER BY created_at DESC', 
            [targetUserId]
        );
        
        res.json({
            profile: userProfile,
            posts: posts
        });

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao carregar o perfil.' });
    }
});


// --- NOVO: Rota de Busca (GET /api/posts/search) ---
router.get('/search', authMiddleware, async (req, res) => {
    const { query, type = 'projects' } = req.query; // 'query' é o termo de busca, 'type' é 'projects' ou 'freelancers'
    const searchTerm = `%${query || ''}%`;

    if (!query) {
         return res.status(400).json({ message: 'O termo de busca (query) é obrigatório.' });
    }

    try {
        if (type === 'freelancers') {
            // Busca por Freelancers (Usuários)
            const [freelancers] = await db.query(
                `SELECT id, name, job_title, profile_picture_url, location, skills 
                 FROM users 
                 WHERE name LIKE ? OR job_title LIKE ? OR skills LIKE ? 
                 LIMIT 20`, 
                [searchTerm, searchTerm, searchTerm]
            );
            return res.json({ type: 'freelancers', results: freelancers });

        } else { // type === 'projects' (Default)
            // Busca por Projetos (Posts)
            const [projects] = await db.query(
                `SELECT 
                    p.id, p.title, p.description, p.thumbnail_url,
                    u.name as user_name, u.profile_picture_url as user_photo
                 FROM posts p
                 JOIN users u ON p.user_id = u.id
                 WHERE p.visibility = "public"
                 AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)
                 LIMIT 20`,
                [searchTerm, searchTerm, searchTerm]
            );
            return res.json({ type: 'projects', results: projects });
        }

    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({ message: 'Erro interno do servidor durante a busca.' });
    }
});


// --- Rota para o Feed Principal (GET /api/posts/feed) (Mantida) ---
router.get('/feed', authMiddleware, async (req, res) => {
    // ... (lógica existente do feed)
    try {
        const [posts] = await db.query(`
            SELECT 
                p.id, p.title, p.description, p.video_url, p.thumbnail_url, p.likes, p.views, 
                u.name as user_name, u.email as user_email
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.visibility = "public"
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        if (posts.length === 0) {
            return res.json({
                message: 'Nenhum post encontrado. Retornando dados simulados.',
                posts: [
                    { id: 99, title: 'Mock Post: UI Design', description: 'Simulação de um projeto de UI/UX moderno.', video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-330-large.mp4', thumbnail_url: 'https://via.placeholder.com/600x1000?text=Mock+Thumb', likes: 120, views: 500, user_name: 'Dev Teste', user_email: 'dev@teste.com' },
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
