const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const app = express();

// ======================
// MANEJO DE ERRORES GLOBAL
// ======================
process.on('uncaughtException', (error) => {
    console.error('❌ ERROR NO CAPTURADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESA RECHAZADA:', reason);
});

// ======================
// CONFIGURACIÓN CORS
// ======================
app.use(cors({
    origin: [
        'https://iaminmaculada.vercel.app',
        'http://localhost:3000', 
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'https://iaminmaculada.vercel.app'  // Asegurar que esté
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Manejar preflight OPTIONS
app.options('*', cors());

app.use(express.json());

// Secret para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'IAM2026_SUPER_SECRETO_CAMBIA_ESTO';

// ======================
// BASE DE DATOS SQLite
// ======================
let db;

async function initDatabase() {
    try {
        const dbPath = process.env.NODE_ENV === 'production' 
            ? '/tmp/iam_database.db'
            : path.join(__dirname, 'iam_database.db');
        
        console.log('📁 Inicializando SQLite en:', dbPath);
        
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // ======================
        // CREAR TABLAS MEJORADAS
        // ======================
        await db.exec(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'viewer',
                is_active BOOLEAN DEFAULT 1,
                created_by TEXT DEFAULT 'system',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS applicants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                age INTEGER NOT NULL,
                phone TEXT NOT NULL,
                parish TEXT,
                email TEXT,
                health_conditions TEXT DEFAULT '[]',
                dietary_restrictions TEXT DEFAULT '[]',
                emergency_contact TEXT NOT NULL,
                comments TEXT,
                transportation TEXT,
                registration_number TEXT UNIQUE,
                status TEXT DEFAULT 'pending',
                device_info TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(full_name, phone) ON CONFLICT IGNORE
            );
            
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_applicants_created ON applicants(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
        `);
        
        // ======================
        // CREAR SUPERADMIN INICIAL
        // ======================
        const superAdminCheck = await db.get(
            'SELECT * FROM admins WHERE username = ?', 
            ['superadmin']
        );
        
        if (!superAdminCheck) {
            const hashedPassword = await bcrypt.hash('IAM2026super', 12);
            
            await db.run(
                `INSERT INTO admins 
                (username, password_hash, full_name, role, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                ['superadmin', hashedPassword, 'Administrador Principal', 'superadmin', 'system']
            );
            
            console.log('🔐 Superadmin creado: superadmin / IAM2026super');
        }
        
        // ======================
        // CREAR ADMINS DE EJEMPLO
        // ======================
        const exampleAdmins = [
            { username: 'maria_admin', password: 'Maria2026', full_name: 'María González', role: 'admin' },
            { username: 'juan_viewer', password: 'Juan2026', full_name: 'Juan Pérez', role: 'viewer' },
            { username: 'iam_admin', password: 'IAM2026admin', full_name: 'Admin IAM', role: 'admin' }
        ];
        
        for (const admin of exampleAdmins) {
            const exists = await db.get('SELECT * FROM admins WHERE username = ?', [admin.username]);
            if (!exists) {
                const hashedPassword = await bcrypt.hash(admin.password, 12);
                await db.run(
                    `INSERT INTO admins (username, password_hash, full_name, role, created_by) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [admin.username, hashedPassword, admin.full_name, admin.role, 'superadmin']
                );
                console.log(`👤 Admin creado: ${admin.username} / ${admin.password}`);
            }
        }
        
        // Verificar conteo inicial
        const adminCount = await db.get('SELECT COUNT(*) as total FROM admins');
        const applicantCount = await db.get('SELECT COUNT(*) as total FROM applicants');
        
        console.log(`✅ Base de datos inicializada - Admins: ${adminCount.total}, Inscripciones: ${applicantCount.total}`);
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// ======================
// MIDDLEWARE DE AUTENTICACIÓN
// ======================
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await db.get('SELECT * FROM admins WHERE id = ? AND is_active = 1', [decoded.adminId]);
        
        if (!admin) {
            return res.status(401).json({ error: 'Admin no encontrado o inactivo' });
        }
        
        req.admin = admin;
        next();
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

const requireSuperAdmin = async (req, res, next) => {
    if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ error: 'Se requiere rol de superadmin' });
    }
    next();
};

// ======================
// ENDPOINTS PÚBLICOS
// ======================
app.get('/', (req, res) => {
    res.json({
        service: 'IAM Backend 2026',
        version: '2.1',
        status: 'online',
        timestamp: new Date().toISOString(),
        endpoints: {
            public: {
                login: 'POST /api/admin/login',
                register: 'POST /api/applicants',
                stats: 'GET /api/stats',
                health: 'GET /health'
            },
            admin: {
                dashboard: 'GET /api/admin/dashboard',
                applicants: 'GET /api/admin/applicants'
            }
        },
        message: 'Servidor de Campamento Misionero IAM 2026'
    });
});

// ======================
// 1. LOGIN DE ADMINISTRADOR
// ======================
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password, adminCode } = req.body;
        
        // Verificar código secreto
        if (!adminCode || adminCode !== 'IAM2026') {
            return res.status(401).json({ 
                success: false, 
                error: 'Código secreto incorrecto' 
            });
        }
        
        const admin = await db.get('SELECT * FROM admins WHERE username = ? AND is_active = 1', [username]);
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        // Actualizar último login
        await db.run('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);
        
        // Generar token JWT
        const token = jwt.sign(
            { 
                adminId: admin.id, 
                username: admin.username, 
                role: admin.role, 
                name: admin.full_name,
                exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 horas
            },
            JWT_SECRET
        );
        
        // Registrar en audit log
        await db.run(
            `INSERT INTO audit_log (admin_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
            [admin.id, 'login', req.ip, req.get('User-Agent')]
        );
        
        console.log(`✅ Login exitoso: ${username} desde ${req.ip}`);
        
        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name,
                role: admin.role,
                created_at: admin.created_at
            }
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// ======================
// 2. REGISTRAR INSCRIPCIÓN (FORMULARIO COMPLETO)
// ======================
app.post('/api/applicants', async (req, res) => {
    try {
        const { 
            fullName, 
            age, 
            phone, 
            parish, 
            email, 
            health = [], 
            diet = [], 
            emergencyContact, 
            comments, 
            transportation 
        } = req.body;
        
        // Validaciones
        if (!fullName || fullName.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'El nombre debe tener al menos 3 caracteres' 
            });
        }
        
        if (!age || age < 8 || age > 17) {
            return res.status(400).json({ 
                success: false, 
                error: 'La edad debe ser entre 8 y 17 años' 
            });
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Teléfono inválido (mínimo 8 dígitos)' 
            });
        }
        
        if (!emergencyContact || emergencyContact.trim().length < 5) {
            return res.status(400).json({ 
                success: false, 
                error: 'Contacto de emergencia requerido' 
            });
        }
        
        // Generar número de registro único
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);
        const registrationNumber = `AVENT-${timestamp.toString().slice(-6)}-${randomNum.toString().padStart(3, '0')}`;
        
        // Preparar datos para inserción
        const healthConditions = Array.isArray(health) ? JSON.stringify(health) : '[]';
        const dietaryRestrictions = Array.isArray(diet) ? JSON.stringify(diet) : '[]';
        
        console.log('📝 Registrando nuevo aventurero:', {
            nombre: fullName,
            edad: age,
            telefono: phone,
            parroquia: parish,
            registro: registrationNumber
        });
        
        // Insertar en la base de datos
        const result = await db.run(
            `INSERT INTO applicants (
                full_name, age, phone, parish, email,
                health_conditions, dietary_restrictions,
                emergency_contact, comments, transportation,
                registration_number, device_info, ip_address, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fullName.trim(),
                parseInt(age),
                phone.trim(),
                parish ? parish.trim() : null,
                email ? email.trim() : null,
                healthConditions,
                dietaryRestrictions,
                emergencyContact.trim(),
                comments ? comments.trim() : '',
                transportation ? transportation.trim() : '',
                registrationNumber,
                req.get('User-Agent') || 'Desconocido',
                req.ip || '0.0.0.0',
                'confirmado'
            ]
        );
        
        console.log(`✅ Nueva inscripción #${result.lastID}: ${fullName} (${registrationNumber})`);
        
        // Obtener datos del registro recién creado
        const newApplicant = await db.get(
            'SELECT * FROM applicants WHERE id = ?',
            [result.lastID]
        );
        
        // Formatear respuesta
        const responseData = {
            id: newApplicant.id,
            fullName: newApplicant.full_name,
            age: newApplicant.age,
            phone: newApplicant.phone,
            parish: newApplicant.parish,
            email: newApplicant.email,
            health: JSON.parse(newApplicant.health_conditions || '[]'),
            diet: JSON.parse(newApplicant.dietary_restrictions || '[]'),
            emergencyContact: newApplicant.emergency_contact,
            comments: newApplicant.comments,
            transportation: newApplicant.transportation,
            registrationNumber: newApplicant.registration_number,
            registrationDate: new Date(newApplicant.created_at).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            status: newApplicant.status
        };
        
        res.status(201).json({
            success: true,
            message: '✅ ¡Inscripción registrada exitosamente!',
            data: responseData,
            stats: {
                total: await getTotalApplicants(),
                availableSpots: Math.max(0, 100 - await getTotalApplicants())
            }
        });
        
    } catch (error) {
        console.error('❌ Error registrando inscripción:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT') {
            if (error.message.includes('UNIQUE') && error.message.includes('full_name')) {
                return res.status(409).json({ 
                    success: false, 
                    error: '⚠️ Ya existe una inscripción con este nombre y teléfono' 
                });
            }
            if (error.message.includes('registration_number')) {
                // Reintentar con nuevo número si hay colisión
                return res.status(409).json({ 
                    success: false, 
                    error: 'Error de registro único, por favor intenta nuevamente' 
                });
            }
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Error al registrar la inscripción',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Función auxiliar para contar total de inscritos
async function getTotalApplicants() {
    try {
        const result = await db.get('SELECT COUNT(*) as total FROM applicants');
        return result.total || 0;
    } catch (error) {
        console.error('Error contando inscritos:', error);
        return 0;
    }
}

// ======================
// 3. ESTADÍSTICAS PÚBLICAS - MEJORADO
// ======================
app.get('/api/stats', async (req, res) => {
    try {
        const [stats, ageStats, parishStats] = await Promise.all([
            db.get(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN health_conditions != '[]' AND health_conditions NOT LIKE '%"Ninguna"%' THEN 1 ELSE 0 END) as with_medical,
                    SUM(CASE WHEN dietary_restrictions != '[]' AND dietary_restrictions NOT LIKE '%"Ninguna"%' THEN 1 ELSE 0 END) as with_diet,
                    COUNT(DISTINCT parish) as parishes_count
                FROM applicants
                WHERE status != 'cancelado'
            `),
            db.get('SELECT AVG(age) as avg_age FROM applicants WHERE status != "cancelado"'),
            db.get(`SELECT parish, COUNT(*) as count FROM applicants WHERE parish IS NOT NULL AND parish != '' AND status != 'cancelado' GROUP BY parish ORDER BY count DESC LIMIT 5`)
        ]);
        
        const total = stats.total || 0;
        const avgAge = total > 0 ? parseFloat(ageStats.avg_age || 0).toFixed(1) : '0.0';
        
        res.json({
            success: true,
            total: total,
            avgAge: avgAge,
            withMedical: stats.with_medical || 0,
            withDiet: stats.with_diet || 0,
            parishesCount: stats.parishes_count || 0,
            topParishes: parishStats ? [parishStats].filter(p => p.parish) : [],
            availableSpots: Math.max(0, 100 - total),
            updated: new Date().toISOString(),
            message: `Actualmente hay ${total} aventureros inscritos. ${100 - total} plazas disponibles.`
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo stats:', error);
        res.json({
            success: true,
            total: 0,
            avgAge: '0.0',
            withMedical: 0,
            withDiet: 0,
            parishesCount: 0,
            topParishes: [],
            availableSpots: 100,
            updated: new Date().toISOString(),
            message: 'Sistema recién iniciado. ¡Sé el primero en inscribirte!'
        });
    }
});

// ======================
// 4. DASHBOARD ADMIN - COMPLETO
// ======================
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        const [totalResult, todayStats, weekStats, ageStats, medicalStats, dietStats] = await Promise.all([
            db.get('SELECT COUNT(*) as total FROM applicants WHERE status != "cancelado"'),
            db.get(`SELECT COUNT(*) as today_count FROM applicants WHERE DATE(created_at) = DATE('now') AND status != "cancelado"`),
            db.get(`SELECT COUNT(*) as week_count FROM applicants WHERE created_at >= DATE('now', '-7 days') AND status != "cancelado"`),
            db.get(`SELECT 
                AVG(age) as avg_age,
                MIN(age) as min_age,
                MAX(age) as max_age,
                SUM(CASE WHEN age BETWEEN 8 AND 10 THEN 1 ELSE 0 END) as kids_8_10,
                SUM(CASE WHEN age BETWEEN 11 AND 13 THEN 1 ELSE 0 END) as preteens_11_13,
                SUM(CASE WHEN age BETWEEN 14 AND 17 THEN 1 ELSE 0 END) as teens_14_17
                FROM applicants WHERE status != "cancelado"`),
            db.get(`SELECT 
                COUNT(*) as with_conditions,
                GROUP_CONCAT(DISTINCT 
                    CASE 
                        WHEN health_conditions LIKE '%Asma%' THEN 'Asma'
                        WHEN health_conditions LIKE '%Alergias%' THEN 'Alergias'
                        WHEN health_conditions LIKE '%Diabetes%' THEN 'Diabetes'
                        WHEN health_conditions LIKE '%Epilepsia%' THEN 'Epilepsia'
                        ELSE NULL 
                    END
                ) as common_conditions
                FROM applicants 
                WHERE health_conditions != '[]' 
                AND health_conditions NOT LIKE '%"Ninguna"%'
                AND status != "cancelado"`),
            db.get(`SELECT 
                COUNT(*) as with_restrictions,
                SUM(CASE WHEN dietary_restrictions LIKE '%Celíaco%' OR dietary_restrictions LIKE '%gluten%' THEN 1 ELSE 0 END) as gluten_free,
                SUM(CASE WHEN dietary_restrictions LIKE '%láctea%' OR dietary_restrictions LIKE '%lactosa%' THEN 1 ELSE 0 END) as lactose_free,
                SUM(CASE WHEN dietary_restrictions LIKE '%vegano%' OR dietary_restrictions LIKE '%vegetariano%' THEN 1 ELSE 0 END) as vegetarian
                FROM applicants 
                WHERE dietary_restrictions != '[]' 
                AND dietary_restrictions NOT LIKE '%"Ninguna"%'
                AND status != "cancelado"`)
        ]);
        
        const total = totalResult.total || 0;
        const avgAge = total > 0 ? parseFloat(ageStats.avg_age || 0).toFixed(1) : '0.0';
        
        res.json({
            success: true,
            admin: { 
                username: req.admin.username, 
                role: req.admin.role,
                full_name: req.admin.full_name,
                last_login: req.admin.last_login
            },
            stats: {
                total: total,
                today: todayStats.today_count || 0,
                thisWeek: weekStats.week_count || 0,
                availableSpots: Math.max(0, 100 - total),
                
                ages: {
                    average: avgAge,
                    min: ageStats.min_age || 0,
                    max: ageStats.max_age || 0,
                    distribution: {
                        kids_8_10: ageStats.kids_8_10 || 0,
                        preteens_11_13: ageStats.preteens_11_13 || 0,
                        teens_14_17: ageStats.teens_14_17 || 0
                    }
                },
                
                medical: {
                    withConditions: medicalStats.with_conditions || 0,
                    commonConditions: medicalStats.common_conditions ? medicalStats.common_conditions.split(',') : []
                },
                
                dietary: {
                    withRestrictions: dietStats.with_restrictions || 0,
                    glutenFree: dietStats.gluten_free || 0,
                    lactoseFree: dietStats.lactose_free || 0,
                    vegetarian: dietStats.vegetarian || 0
                }
            },
            serverTime: new Date().toISOString(),
            message: `Dashboard cargado correctamente. ${total} aventureros registrados.`
        });
        
    } catch (error) {
        console.error('❌ Error en dashboard:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error cargando dashboard',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ======================
// 5. OBTENER INSCRIPCIONES (PARA ADMIN)
// ======================
app.get('/api/admin/applicants', authenticateToken, async (req, res) => {
    try {
        const { limit = 100, offset = 0, search = '', status = '' } = req.query;
        
        let query = `
            SELECT 
                id, full_name, age, phone, parish, email,
                health_conditions, dietary_restrictions,
                emergency_contact, comments, transportation,
                registration_number, status, created_at, updated_at
            FROM applicants 
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        } else {
            query += ' AND status != "cancelado"';
        }
        
        if (search) {
            query += ' AND (full_name LIKE ? OR phone LIKE ? OR registration_number LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const applicants = await db.all(query, params);
        
        // Contar total para paginación
        let countQuery = 'SELECT COUNT(*) as total FROM applicants WHERE 1=1';
        const countParams = [];
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        } else {
            countQuery += ' AND status != "cancelado"';
        }
        
        if (search) {
            countQuery += ' AND (full_name LIKE ? OR phone LIKE ? OR registration_number LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        const countResult = await db.get(countQuery, countParams);
        
        // Formatear respuesta
        const formattedApplicants = applicants.map(app => ({
            id: app.id,
            full_name: app.full_name,
            age: app.age,
            phone: app.phone,
            parish: app.parish,
            email: app.email,
            health_conditions: JSON.parse(app.health_conditions || '[]'),
            dietary_restrictions: JSON.parse(app.dietary_restrictions || '[]'),
            emergency_contact: app.emergency_contact,
            comments: app.comments,
            transportation: app.transportation,
            registration_number: app.registration_number,
            status: app.status,
            created_at: app.created_at,
            updated_at: app.updated_at,
            registration_date: new Date(app.created_at).toLocaleString('es-ES')
        }));
        
        res.json({
            success: true,
            data: formattedApplicants,
            pagination: {
                total: countResult.total || 0,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + formattedApplicants.length) < (countResult.total || 0)
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo inscripciones:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo inscripciones',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ======================
// 6. BUSCAR INSCRIPCIÓN POR NÚMERO DE REGISTRO
// ======================
app.get('/api/applicants/:registrationNumber', async (req, res) => {
    try {
        const { registrationNumber } = req.params;
        
        const applicant = await db.get(
            `SELECT * FROM applicants WHERE registration_number = ? AND status != "cancelado"`,
            [registrationNumber]
        );
        
        if (!applicant) {
            return res.status(404).json({ 
                success: false, 
                error: 'Inscripción no encontrada' 
            });
        }
        
        res.json({
            success: true,
            data: {
                ...applicant,
                health_conditions: JSON.parse(applicant.health_conditions || '[]'),
                dietary_restrictions: JSON.parse(applicant.dietary_restrictions || '[]')
            }
        });
        
    } catch (error) {
        console.error('Error buscando inscripción:', error);
        res.status(500).json({ success: false, error: 'Error buscando inscripción' });
    }
});

// ======================
// 7. ACTUALIZAR ESTADO DE INSCRIPCIÓN (ADMIN)
// ======================
app.patch('/api/admin/applicants/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pendiente', 'confirmado', 'cancelado', 'completado'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Estado inválido' 
            });
        }
        
        const result = await db.run(
            'UPDATE applicants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Inscripción no encontrada' 
            });
        }
        
        // Registrar en audit log
        await db.run(
            `INSERT INTO audit_log (admin_id, action, details) VALUES (?, ?, ?)`,
            [req.admin.id, 'update_status', `Cambió estado a ${status} para inscripción ${id}`]
        );
        
        res.json({
            success: true,
            message: `Estado actualizado a ${status}`,
            changes: result.changes
        });
        
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ success: false, error: 'Error actualizando estado' });
    }
});

// ======================
// 8. ELIMINAR INSCRIPCIÓN (SUPERADMIN)
// ======================
app.delete('/api/admin/applicants/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.run('DELETE FROM applicants WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Inscripción no encontrada' 
            });
        }
        
        // Registrar en audit log
        await db.run(
            `INSERT INTO audit_log (admin_id, action, details) VALUES (?, ?, ?)`,
            [req.admin.id, 'delete_applicant', `Eliminó inscripción ${id}`]
        );
        
        res.json({
            success: true,
            message: 'Inscripción eliminada correctamente',
            changes: result.changes
        });
        
    } catch (error) {
        console.error('Error eliminando inscripción:', error);
        res.status(500).json({ success: false, error: 'Error eliminando inscripción' });
    }
});

// ======================
// 9. ENDPOINT DE SALUD
// ======================
app.get('/health', async (req, res) => {
    try {
        // Verificar conexión a base de datos
        const dbCheck = await db.get('SELECT 1 as ok');
        const stats = await db.get('SELECT COUNT(*) as total FROM applicants');
        const admins = await db.get('SELECT COUNT(*) as total FROM admins');
        
        res.json({
            status: 'healthy',
            service: 'IAM Backend 2026',
            timestamp: new Date().toISOString(),
            database: dbCheck ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            stats: {
                applicants: stats.total || 0,
                admins: admins.total || 0,
                available_spots: Math.max(0, 100 - (stats.total || 0))
            },
            version: '2.1',
            environment: process.env.NODE_ENV || 'development'
        });
        
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ======================
// 10. OBTENER LOGS DE AUDITORÍA (ADMIN)
// ======================
app.get('/api/admin/audit-logs', authenticateToken, async (req, res) => {
    try {
        const logs = await db.all(`
            SELECT al.*, a.username as admin_username
            FROM audit_log al
            LEFT JOIN admins a ON al.admin_id = a.id
            ORDER BY al.created_at DESC
            LIMIT 50
        `);
        
        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
        
    } catch (error) {
        console.error('Error obteniendo logs:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo logs' });
    }
});

// ======================
// 11. LIMPIAR TODOS LOS DATOS (SUPERADMIN)
// ======================
app.delete('/api/admin/clear-all', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { confirm, adminKey } = req.query;
        
        // Validaciones de seguridad
        if (!confirm || confirm !== 'true') {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere confirmación explícita (confirm=true)' 
            });
        }
        
        if (!adminKey || adminKey !== 'IAM2026') {
            return res.status(401).json({ 
                success: false, 
                error: 'Clave de administración incorrecta' 
            });
        }
        
        console.warn(`⚠️ ATENCIÓN: ${req.admin.username} está eliminando TODOS los datos`);
        
        // Eliminar todos los registros de applicants
        const deleteResult = await db.run('DELETE FROM applicants');
        
        // Reiniciar los autoincrements (opcional, para SQLite)
        await db.run('DELETE FROM sqlite_sequence WHERE name="applicants"');
        
        // Registrar en audit log
        await db.run(
            `INSERT INTO audit_log (admin_id, action, details, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.admin.id, 
                'clear_all_data', 
                `Eliminó TODOS los datos (${deleteResult.changes} registros eliminados)`,
                req.ip,
                req.get('User-Agent')
            ]
        );
        
        console.log(`✅ Todos los datos eliminados: ${deleteResult.changes} registros`);
        
        res.json({
            success: true,
            message: `✅ Misión reiniciada. Se eliminaron ${deleteResult.changes} registros.`,
            deleted: deleteResult.changes,
            timestamp: new Date().toISOString(),
            admin: req.admin.username
        });
        
    } catch (error) {
        console.error('❌ Error eliminando datos:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error eliminando datos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ======================
// MANEJO DE ERRORES 404
// ======================
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint no encontrado',
        path: req.path,
        method: req.method 
    });
});

// ======================
// MANEJO DE ERRORES GLOBAL
// ======================
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
        timestamp: new Date().toISOString()
    });
});

// ======================
// INICIAR SERVIDOR
// ======================
const PORT = process.env.PORT || 10000;

async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`
            🚀 IAM BACKEND 2026 - SQLite Edition
            ✅ Puerto: ${PORT}
            📍 URL: http://0.0.0.0:${PORT}
            🌐 Accesible desde: https://iaminmaculada.onrender.com
            🗄️  Base de datos: SQLite
            🔐 Superadmin: superadmin / IAM2026super
            👤 Admin ejemplo: maria_admin / Maria2026
            👤 Viewer ejemplo: juan_viewer / Juan2026
            🔑 Código secreto: IAM2026
            ⏰ Iniciado: ${new Date().toLocaleString()}
            
            📊 ENDPOINTS DISPONIBLES:
            POST   /api/admin/login      - Login admin
            POST   /api/applicants       - Registrar aventurero
            GET    /api/stats            - Estadísticas públicas
            GET    /api/admin/dashboard  - Dashboard admin (requiere token)
            GET    /api/admin/applicants - Lista completa (requiere token)
            GET    /health               - Estado del servidor
            `);
        });
        
    } catch (error) {
        console.error('❌ Error fatal iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando base de datos...');
    if (db) await db.close();
    console.log('✅ Base de datos cerrada');
    process.exit(0);
});

// Iniciar
startServer();