const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configuração do Cloudinary usando as variáveis de ambiente
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Apenas para log de confirmação
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    console.log('✅ Cloudinary configurado com sucesso.');
} else {
    console.warn('⚠️ Cloudinary: Variáveis de ambiente faltando.');
}

module.exports = cloudinary;
