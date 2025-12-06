const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware');
const cloudinary = require('./cloudinary'); // Importa a config do Cloudinary
const multer = require('multer'); // Importa o Multer
require('dotenv').config();

// Configuração do Multer: Armazenamento em memória (buffer) para enviar ao Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Rota de Criação de Post (POST /api/posts/create) ---
router.post('/create', authMiddleware, upload.single('video'), async (req, res) => {
    // req.user está disponível aqui (do authMiddleware)
    const userId = req.user.id;
    const { title, description, tags, visibility = 'public' } = req.body;
    const videoFile = req.file;

    if (!title || !description || !videoFile) {
        return res.status(400).json({ message: 'Título, descrição e arquivo de vídeo são obrigatórios.' });
    }

    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(videoFile.mimetype)) {
        return res.status(400).json({ message: 'Formato de arquivo não suportado. Use MP4, MOV ou WebM.' });
    }

    try {
        // 1. Upload do arquivo para o Cloudinary
        const result = await cloudinary.uploader.upload(
            `data:${videoFile.mimetype};base64,${videoFile.buffer.toString('base64')}`,
            {
                resource_type: "video",
                folder: "freelancer_posts", // Pasta no Cloudinary
                chunk_size: 6000000, // Tamanho do chunk para uploads grandes
            }
        );
        
        const videoUrl = result.secure_url;
        // O Cloudinary gera a URL da thumbnail automaticamente (adicionando .jpg) ou podemos usar a URL do preview
        const thumbnailUrl = result.secure_url.replace(/\.mp4$/, '.jpg').replace(/\.mov$/, '.jpg').replace(/\.webm$/, '.jpg'); 

        // 2. Salvar metadados no MySQL
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

// --- Rota para o Feed Principal (GET /api/posts/feed) (Mantida) ---
router.get('/feed', authMiddleware, async (req, res) => {
    // ... (lógica existente do feed)
    try {
        const userId = req.user.id;
        
        const [posts] = await db.query(`
            SELECT 
                p.id, p.title, p.description, p.video_url, p.thumbnail_url, p.likes, p.views, 
                u.name as user_name, u.email as user_email
            FROM posts p
            JOIN users u ON p.user_id = u.id
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
