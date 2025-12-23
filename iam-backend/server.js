const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// IMPORTANTE: Permitir solicitudes desde tu dominio
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://tudominio.com',  // Tu dominio real
    'file://'  // Para probar localmente
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'Origen no permitido por CORS';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// Base de datos en memoria
let applicants = [];
let nextId = 1;

// ===== ENDPOINTS =====

// 1. Prueba de conexión
app.get('/', (req, res) => {
    res.json({
        message: '✅ Backend IAM funcionando',
        endpoints: {
            inscripciones: 'POST /api/inscribir',
            obtener: 'GET /api/inscripciones?adminKey=IAM2026',
            estadisticas: 'GET /api/stats'
        }
    });
});

// 2. Guardar inscripción (FORMULARIO)
app.post('/api/inscribir', (req, res) => {
    console.log('📝 Recibiendo inscripción de:', req.ip);
    
    try {
        const applicantData = req.body;
        
        // Validaciones básicas
        if (!applicantData.fullName || applicantData.fullName.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'El nombre debe tener al menos 3 caracteres'
            });
        }
        
        if (!applicantData.phone || applicantData.phone.trim().length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Teléfono inválido'
            });
        }
        
        // Crear objeto completo
        const newApplicant = {
            id: `app-${Date.now()}`,
            ...applicantData,
            registrationNumber: `AVENT-${Date.now().toString().slice(-6)}`,
            registrationDate: new Date().toLocaleString('es-ES'),
            receivedAt: new Date().toISOString(),
            status: 'Pendiente',
            source: 'render-backend'
        };
        
        // Evitar duplicados exactos
        const isDuplicate = applicants.some(app => 
            app.fullName === newApplicant.fullName && 
            app.phone === newApplicant.phone
        );
        
        if (isDuplicate) {
            return res.status(409).json({
                success: false,
                error: 'Ya existe una inscripción con estos datos'
            });
        }
        
        // Guardar
        applicants.push(newApplicant);
        console.log(`✅ Guardado: ${newApplicant.fullName} (Total: ${applicants.length})`);
        
        res.json({
            success: true,
            message: '¡Inscripción exitosa!',
            data: newApplicant,
            count: applicants.length
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// 3. Obtener inscripciones (ADMIN)
app.get('/api/inscripciones', (req, res) => {
    const { adminKey } = req.query;
    
    if (adminKey !== 'IAM2026') {
        return res.status(403).json({
            success: false,
            error: 'Clave de administrador incorrecta'
        });
    }
    
    res.json({
        success: true,
        count: applicants.length,
        data: applicants,
        timestamp: new Date().toISOString()
    });
});

// 4. Estadísticas (para el contador)
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        total: applicants.length,
        available: Math.max(0, 100 - applicants.length),
        percentage: ((applicants.length / 100) * 100).toFixed(1),
        updated: new Date().toISOString()
    });
});

// 5. Limpiar base de datos (ADMIN)
app.delete('/api/clear', (req, res) => {
    const { adminKey, confirm } = req.query;
    
    if (adminKey !== 'IAM2026' || confirm !== 'true') {
        return res.status(403).json({
            success: false,
            error: 'Requiere confirmación y clave de admin'
        });
    }
    
    const previousCount = applicants.length;
    applicants = [];
    
    console.log(`🗑️ Base de datos limpiada (${previousCount} registros)`);
    
    res.json({
        success: true,
        message: `Se eliminaron ${previousCount} registros`,
        previousCount: previousCount
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`
    🚀 Servidor IAM Backend
    ✅ Puerto: ${PORT}
    📍 URL: http://localhost:${PORT}
    ⏰ ${new Date().toLocaleString()}
    👥 Inscripciones: 0
    `);
});