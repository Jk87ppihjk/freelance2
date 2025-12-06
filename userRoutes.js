const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware'); 
const cloudinary = require('./cloudinary');
const multer = require('multer');

// Configuração do Multer (armazenamento em memória para Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB para imagens
});


// --------------------------------------------------
// 1. Rota para obter o perfil do usuário logado (GET /api/users/me)
// --------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
    // O ID do usuário é injetado pelo authMiddleware
    const userId = req.user.id; 
    
    try {
        const [users] = await db.query(
            'SELECT id, name, email, bio, location, job_title, skills, profile_picture_url FROM users WHERE id = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Perfil não encontrado.' });
        }
        
        res.json({ profile: users[0] });

    } catch (error) {
        console.error('Erro ao buscar meu perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// --------------------------------------------------
// 2. Rota de Atualização de Perfil (PUT /api/users/profile)
// --------------------------------------------------
router.put('/profile', authMiddleware, async (req, res) => {
    const userId = req.user.id; 
    
    const { 
        name, 
        bio, 
        location, 
        job_title, 
        skills // Espera-se uma string de texto separada por vírgulas ou um array
    } = req.body;

    const updates = [];
    const values = [];

    if (name) {
        updates.push('name = ?');
        values.push(name);
    }
    if (bio) {
        updates.push('bio = ?');
        values.push(bio);
    }
    if (location) {
        updates.push('location = ?');
        values.push(location);
    }
    if (job_title) {
        updates.push('job_title = ?');
        values.push(job_title);
    }
    if (skills) {
        // Converte a string de skills em formato JSON para armazenamento
        try {
            const skillsArray = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
            updates.push('skills = ?');
            values.push(JSON.stringify(skillsArray));
        } catch (e) {
            return res.status(400).json({ message: 'Formato de skills inválido.' });
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
    }

    values.push(userId);
    
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    try {
        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado ou nenhum dado alterado.' });
        }

        res.json({ message: 'Perfil atualizado com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar perfil.' });
    }
});


// --------------------------------------------------
// 3. Rota de Upload de Foto de Perfil (POST /api/users/profile/photo)
// --------------------------------------------------
router.post('/profile/photo', authMiddleware, upload.single('profile_picture'), async (req, res) => {
    const userId = req.user.id;
    const imageFile = req.file;

    if (!imageFile) {
        return res.status(400).json({ message: 'Arquivo de imagem é obrigatório (use o nome de campo "profile_picture").' });
    }

    try {
        // 1. Upload do arquivo para o Cloudinary
        const result = await cloudinary.uploader.upload(
            `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`,
            {
                resource_type: "image",
                folder: "freelancer_profiles",
                transformation: [
                    {width: 300, height: 300, crop: "fill"}
                ]
            }
        );
        
        const photoUrl = result.secure_url;

        // 2. Atualizar a URL da foto no MySQL
        const sql = 'UPDATE users SET profile_picture_url = ? WHERE id = ?';
        const [dbResult] = await db.query(sql, [photoUrl, userId]);

        if (dbResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        res.json({ 
            message: 'Foto de perfil atualizada com sucesso!', 
            profile_picture_url: photoUrl 
        });

    } catch (error) {
        console.error('Erro ao fazer upload da foto de perfil:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao processar o upload.' });
    }
});


module.exports = router;
