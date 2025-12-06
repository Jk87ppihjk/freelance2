const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware');
const cloudinary = require('./cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configuração do Multer (armazenamento em memória)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// --------------------------------------------------
// 1. Rota de Criação de Post (POST /api/posts/create)
// --------------------------------------------------
router.post('/create', authMiddleware, upload.single('video'), async (req, res) => {
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
        const thumbnailUrl = result.secure_url.replace(/\.[a-z0-9]+$/, '.jpg'); 

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


// --------------------------------------------------
// 2. Rota de Curtida/Descurtida (POST /api/posts/:postId/like)
// --------------------------------------------------
router.post('/:postId/like', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const postId = req.params.postId;

    if (!postId) {
        return res.status(400).json({ message: 'ID do Post é obrigatório.' });
    }
    
    try {
        // --- VERIFICAÇÃO DE EXISTÊNCIA (CORREÇÃO) ---
        const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            console.warn(`Tentativa de curtir post com ID não existente: ${postId}`);
            return res.status(404).json({ message: 'Post não encontrado no banco de dados. (Pode ser dado simulado)' });
        }
        // ---------------------------------------------

        const [existingLike] = await db.query(
            'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );

        if (existingLike.length > 0) {
            // Descurtir
            await db.query(
                'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
                [userId, postId]
            );
            await db.query(
                'UPDATE posts SET likes = likes - 1 WHERE id = ?',
                [postId]
            );
            return res.json({ message: 'Post descurtido com sucesso.', liked: false });
        } else {
            // Curtir
            await db.query(
                'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
                [userId, postId]
            );
            await db.query(
                'UPDATE posts SET likes = likes + 1 WHERE id = ?',
                [postId]
            );
            return res.json({ message: 'Post curtido com sucesso!', liked: true });
        }

    } catch (error) {
        // Loga o erro, mas agora o erro de FK não deve mais acontecer aqui
        console.error('Erro ao processar like/unlike:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --------------------------------------------------
// 3. Rota para o Feed Principal (GET /api/posts/feed)
// --------------------------------------------------
router.get('/feed', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const [posts] = await db.query(`
            SELECT 
                p.id, p.title, p.description, p.video_url, p.thumbnail_url, p.likes, p.views, 
                u.name as user_name, u.email as user_email,
                CASE WHEN pl.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_liked,
                (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = ?
            WHERE p.visibility = "public"
            ORDER BY p.created_at DESC
            LIMIT 10
        `, [userId]);

        if (posts.length === 0) {
            // Retorna post simulado
            return res.json({
                message: 'Nenhum post encontrado. Retornando dados simulados.',
                posts: [
                    // MANTEM ID ALTO PARA SIMULAR DADO, mas o backend irá barrar o like
                    { id: 99, title: 'Mock Post: UI Design', description: 'Simulação de um projeto de UI/UX moderno.', video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-330-large.mp4', thumbnail_url: 'https://via.placeholder.com/600x1000?text=Mock+Thumb', likes: 120, views: 500, user_name: 'Dev Teste', user_email: 'dev@teste.com', is_liked: false, comments_count: 5 },
                ]
            });
        }
        
        res.json({ posts: posts });

    } catch (error) {
        console.error('Erro ao buscar o feed:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao carregar o feed.' });
    }
});


// --------------------------------------------------
// 4. Rota de Adicionar Comentário (POST /api/posts/:postId/comments)
// --------------------------------------------------
router.post('/:postId/comments', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const postId = req.params.postId;
    const { content } = req.body;

    if (!postId || !content || content.trim().length === 0) {
        return res.status(400).json({ message: 'ID do Post e conteúdo do comentário são obrigatórios.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, userId, content]
        );

        res.status(201).json({ 
            message: 'Comentário adicionado com sucesso.', 
            commentId: result.insertId,
            userId: userId
        });

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao adicionar comentário.' });
    }
});


// --------------------------------------------------
// 5. Rota para Buscar Comentários (GET /api/posts/:postId/comments)
// --------------------------------------------------
router.get('/:postId/comments', authMiddleware, async (req, res) => {
    const postId = req.params.postId;

    if (!postId) {
        return res.status(400).json({ message: 'ID do Post é obrigatório.' });
    }

    try {
        const [comments] = await db.query(`
            SELECT 
                pc.id, pc.content, pc.created_at,
                u.id AS user_id, u.name AS user_name, u.profile_picture_url
            FROM post_comments pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.post_id = ?
            ORDER BY pc.created_at DESC
        `, [postId]);

        res.json({ comments: comments });

    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar comentários.' });
    }
});


// --------------------------------------------------
// 6. Rota para Perfil e Posts (GET /api/posts/profile/:userId)
// --------------------------------------------------
router.get('/profile/:userId', authMiddleware, async (req, res) => {
    const targetUserId = req.params.userId;
    
    if (!targetUserId) {
        return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
    }

    try {
        const [users] = await db.query(
            'SELECT id, name, email, bio, location, job_title, skills, profile_picture_url FROM users WHERE id = ?', 
            [targetUserId]
        );
        const userProfile = users[0];

        if (!userProfile) {
            return res.status(404).json({ message: 'Perfil não encontrado.' });
        }
        
        if (!userProfile.bio) userProfile.bio = "Editor de vídeo apaixonado por contar histórias.";
        if (!userProfile.location) userProfile.location = "São Paulo, Brasil";
        if (!userProfile.job_title) userProfile.job_title = "Editor(a) de Vídeo";
        if (!userProfile.skills) userProfile.skills = JSON.stringify(["Adobe Premiere", "Motion Graphics"]);
        if (!userProfile.profile_picture_url) userProfile.profile_picture_url = "https://lh3.googleusercontent.com/aida-public/AB6AXuAX6x7ogB02_IUN6VFkgzfxjSjBK3tPs2l7PGbzdMqtbxHTtxSHpSWBk5liz_aL-hYLa-Lot41BhbI28bQ1HL0yvUFTB3Hp2dUztUcun6juA5Gbf8vE1Ujd3sccShjP7HpbfzU1meivQPkVJhXU5o5XJbiMJFX148wu0NRY31S7mfqZlvewZId4GCnKznPdFFat0X3rUPYgl7y6z5gW5qeoQ85zgDxCHWtWTCYFT43TUGa-_NKGmqtaGJPd-zkjrSbXDTUG9djotOKF";


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


// --------------------------------------------------
// 7. Rota de Busca (GET /api/posts/search)
// --------------------------------------------------
router.get('/search', authMiddleware, async (req, res) => {
    const { query, type = 'projects' } = req.query; 
    const searchTerm = `%${query || ''}%`;

    if (!query) {
         return res.status(400).json({ message: 'O termo de busca (query) é obrigatório.' });
    }

    try {
        if (type === 'freelancers') {
            const [freelancers] = await db.query(
                `SELECT id, name, job_title, profile_picture_url, location, skills 
                 FROM users 
                 WHERE name LIKE ? OR job_title LIKE ? OR skills LIKE ? 
                 LIMIT 20`, 
                [searchTerm, searchTerm, searchTerm]
            );
            return res.json({ type: 'freelancers', results: freelancers });

        } else { // type === 'projects' (Default)
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


module.exports = router;
