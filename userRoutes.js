const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware'); 
// Multer e Cloudinary podem ser necessários para upload de fotos de perfil, 
// mas focaremos primeiro nos campos de texto.

// --- Rota de Atualização de Perfil (PUT /api/users/profile) ---
// Esta rota permite ao usuário autenticado atualizar seus próprios dados de perfil.
router.put('/profile', authMiddleware, async (req, res) => {
    // ID do usuário obtido do token JWT
    const userId = req.user.id; 
    
    // Campos que podem ser atualizados
    const { 
        name, 
        bio, 
        location, 
        job_title, 
        skills // Deve ser uma string de JSON ou uma lista de strings
    } = req.body;

    // Constrói a query de atualização dinamicamente
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
        // Armazenamos as habilidades como um JSON string no banco de dados
        try {
            const skillsArray = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
            updates.push('skills = ?');
            values.push(JSON.stringify(skillsArray));
        } catch (e) {
            return res.status(400).json({ message: 'Formato de skills inválido.' });
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
    }

    // Adiciona o ID do usuário para a cláusula WHERE
    values.push(userId);
    
    // Constrói a query final
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

// --- Rota para obter o perfil do usuário logado ---
// Conveniente para a página de edição de perfil
router.get('/me', authMiddleware, async (req, res) => {
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


module.exports = router;
