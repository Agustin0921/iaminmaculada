// ===== GESTIÓN DEL BACKEND MEJORADA =====

class BackendManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.useLocalStorage = false;
        this.firebaseAvailable = true;
        this.firebaseError = null;
    }

    // ===== INICIALIZACIÓN CON MANEJO DE ERRORES =====
    async initialize() {
        try {
            // Verificar si existe la configuración de Firebase
            if (!window.firebaseConfig || !window.firebaseConfig.initialize) {
                throw new Error("Configuración de Firebase no disponible");
            }

            const result = await window.firebaseConfig.initialize();
            
            if (result.success) {
                this.db = result.db;
                this.auth = result.auth;
                this.isInitialized = true;
                this.firebaseAvailable = true;
                this.firebaseError = null;
                
                console.log("✅ BackendManager inicializado con Firebase");
                
                // Escuchar cambios en autenticación
                this.auth.onAuthStateChanged((user) => {
                    this.currentUser = user;
                    console.log("👤 Estado de autenticación:", user ? "Conectado" : "Desconectado");
                });
                
                return { success: true, mode: 'firebase' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.warn("⚠️ Firebase no disponible:", error.message);
            this.firebaseAvailable = false;
            this.firebaseError = error.message;
            this.useLocalStorage = true;
            
            // Solo mostrar notificación si es un error grave
            if (!error.message.includes('quota') && !error.message.includes('Quota')) {
                setTimeout(() => {
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('⚠️ Modo offline activado', 'warning');
                    }
                }, 2000);
            }
            
            return { success: false, mode: 'localstorage', error: error.message };
        }
    }

    // ===== AUTENTICACIÓN MEJORADA =====
    async loginIamAdmin(email, password, adminCode) {
        // 1. Verificar código secreto
        if (adminCode !== "IAM2026") {
            return { success: false, error: "Código secreto incorrecto" };
        }
        
        // 2. Intentar con Firebase si está disponible
        if (this.firebaseAvailable && this.auth) {
            try {
                const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
                const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
                const user = userCredential.user;
                
                // Verificar permisos de admin
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const adminDoc = await getDoc(doc(this.db, 'radio_admins', user.uid));
                
                if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        role: 'admin',
                        isIamAdmin: true
                    };
                    
                    // Guardar sesión
                    localStorage.setItem('iamAdminLoggedIn', 'true');
                    localStorage.setItem('iamAdminEmail', email);
                    localStorage.setItem('iamAdminUID', user.uid);
                    
                    return { success: true, user: this.currentUser };
                } else {
                    await this.auth.signOut();
                    return { success: false, error: "No tienes permisos de administrador" };
                }
            } catch (firebaseError) {
                console.warn("⚠️ Error de Firebase:", firebaseError.message);
                
                // Si es error de cuota, usar autenticación local
                if (firebaseError.code === 'resource-exhausted' || firebaseError.message.includes('quota')) {
                    console.log("📝 Usando autenticación local por cuota excedida");
                    return this.loginLocalAdmin(email, password, adminCode);
                }
                
                return { 
                    success: false, 
                    error: this.translateAuthError(firebaseError.code) 
                };
            }
        }
        
        // 3. Usar autenticación local como fallback
        return this.loginLocalAdmin(email, password, adminCode);
    }

    loginLocalAdmin(email, password, adminCode) {
        // Verificar código
        if (adminCode !== "IAM2026") {
            return { success: false, error: "Código secreto incorrecto" };
        }
        
        // Admins locales predefinidos
        const localAdmins = [
            { email: "admin@iam.com", password: "admin2026", username: "admin" },
            { email: "organizador@iam.com", password: "campamento2026", username: "organizador" }
        ];
        
        // Aceptar username@iam.com o solo username
        const cleanEmail = email.includes('@') ? email : `${email}@iam.com`;
        
        const admin = localAdmins.find(a => 
            (a.email === cleanEmail || a.username === email) && 
            a.password === password
        );
        
        if (admin) {
            this.currentUser = {
                uid: `local-${Date.now()}`,
                email: admin.email,
                role: 'admin',
                isIamAdmin: true
            };
            
            localStorage.setItem('iamAdminLoggedIn', 'true');
            localStorage.setItem('iamAdminEmail', admin.email);
            localStorage.setItem('iamAdminUID', this.currentUser.uid);
            
            return { success: true, user: this.currentUser };
        }
        
        return { success: false, error: "Usuario o contraseña incorrectos" };
    }

    isIamAdminAuthenticated() {
        const isLoggedIn = localStorage.getItem('iamAdminLoggedIn') === 'true';
        const adminUID = localStorage.getItem('iamAdminUID');
        
        if (isLoggedIn && adminUID) {
            // Restaurar usuario desde localStorage si no existe
            if (!this.currentUser) {
                this.currentUser = {
                    uid: adminUID,
                    email: localStorage.getItem('iamAdminEmail'),
                    role: 'admin',
                    isIamAdmin: true
                };
            }
            return true;
        }
        
        return false;
    }

    logoutIamAdmin() {
        localStorage.removeItem('iamAdminLoggedIn');
        localStorage.removeItem('iamAdminEmail');
        localStorage.removeItem('iamAdminUID');
        
        if (this.currentUser) {
            this.currentUser.isIamAdmin = false;
        }
        
        return { success: true };
    }

    // ===== GESTIÓN DE INSCRIPCIONES =====
    async saveApplicant(applicantData) {
        try {
            const applicantId = Date.now();
            const registrationNumber = `AVENT-${applicantId.toString().slice(-6)}`;
            
            const applicantToSave = {
                ...applicantData,
                id: applicantId,
                registrationNumber: registrationNumber,
                registrationDate: new Date().toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                status: 'pending',
                createdAt: new Date().toISOString(),
                source: this.firebaseAvailable ? 'firebase' : 'local'
            };

            // 1. Verificar duplicados en localStorage
            const localApplicants = this.getLocalApplicants();
            const isDuplicate = localApplicants.some(existing => 
                existing.fullName === applicantToSave.fullName && 
                existing.phone === applicantToSave.phone
            );
            
            if (isDuplicate) {
                return { 
                    success: false, 
                    error: "Ya existe una inscripción con estos datos" 
                };
            }

            // 2. Guardar en localStorage (SIEMPRE)
            localApplicants.push(applicantToSave);
            localStorage.setItem('iamApplicants', JSON.stringify(localApplicants));
            
            // 3. Intentar guardar en Firebase (solo si está disponible y NO supera la cuota)
            if (this.firebaseAvailable && this.db && this.isInitialized) {
                try {
                    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                    await addDoc(collection(this.db, 'applicants'), applicantToSave);
                    console.log("✅ Guardado en Firebase");
                } catch (firebaseError) {
                    console.warn("⚠️ Error guardando en Firebase:", firebaseError.message);

                    // Marcar Firebase como no disponible si es error de cuota
                    if (firebaseError.code === 'resource-exhausted' || 
                        firebaseError.message.includes('quota') ||
                        firebaseError.message.includes('Quota')) {
                        this.firebaseAvailable = false;
                        this.firebaseError = "Cuota excedida - Modo offline activado";
                        
                        // Mostrar notificación al usuario
                        setTimeout(() => {
                            if (typeof window.showNotification === 'function') {
                                window.showNotification('⚠️ Modo offline: Datos guardados localmente', 'warning');
                            }
                        }, 100);
                    }
                }
            }

            return { 
                success: true, 
                id: applicantId,
                registrationNumber: registrationNumber,
                data: applicantToSave,
                mode: this.firebaseAvailable ? 'firebase' : 'local'
            };
        } catch (error) {
            console.error("❌ Error crítico guardando inscripción:", error);
            return { 
                success: false, 
                error: "Error al guardar la inscripción" 
            };
        }
    }

    async getAllApplicants() {
        try {
            // Si Firebase está disponible, intentar obtener datos
            if (this.firebaseAvailable && this.db && this.isInitialized) {
                try {
                    const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                    const q = query(collection(this.db, 'applicants'), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    
                    const firebaseApplicants = [];
                    querySnapshot.forEach((doc) => {
                        firebaseApplicants.push({
                            firebaseId: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    // Combinar con datos locales
                    const localApplicants = this.getLocalApplicants();
                    const allApplicants = this.mergeApplicants(firebaseApplicants, localApplicants);
                    
                    return { success: true, data: allApplicants, source: 'firebase' };
                } catch (firebaseError) {
                    console.warn("⚠️ Error obteniendo de Firebase:", firebaseError.message);
                    // Continuar con datos locales
                }
            }
            
            // Usar datos locales como fallback
            const localApplicants = this.getLocalApplicants();
            return { success: true, data: localApplicants, source: 'localstorage' };
        } catch (error) {
            console.error("❌ Error obteniendo inscripciones:", error);
            return { success: false, data: [], error: error.message };
        }
    }

    async getRecentApplicants(limitCount = 5) {
        const result = await this.getAllApplicants();
        if (result.success) {
            const recent = result.data.slice(0, limitCount);
            return { success: true, data: recent, source: result.source };
        }
        return result;
    }

    async getApplicantCount() {
        const result = await this.getAllApplicants();
        if (result.success) {
            return { success: true, count: result.data.length };
        }
        return { success: false, count: 0 };
    }

    async clearAllData() {
        try {
            // 1. Limpiar localStorage
            localStorage.removeItem('iamApplicants');
            
            // 2. Limpiar Firebase si está disponible
            if (this.firebaseAvailable && this.db && this.isInitialized) {
                try {
                    const { collection, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                    const querySnapshot = await getDocs(collection(this.db, 'applicants'));
                    
                    const deletePromises = [];
                    querySnapshot.forEach((doc) => {
                        deletePromises.push(deleteDoc(doc.ref));
                    });
                    
                    await Promise.all(deletePromises);
                    console.log("✅ Datos eliminados de Firebase");
                } catch (firebaseError) {
                    console.warn("⚠️ No se pudieron eliminar datos de Firebase:", firebaseError.message);
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error("❌ Error limpiando datos:", error);
            return { success: false, error: error.message };
        }
    }

    // ===== FUNCIONES AUXILIARES =====
    getLocalApplicants() {
        try {
            const stored = localStorage.getItem('iamApplicants');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("❌ Error parseando datos locales:", error);
            return [];
        }
    }

    mergeApplicants(firebaseApps, localApps) {
        const uniqueMap = new Map();
        
        // Agregar de Firebase primero
        firebaseApps.forEach(app => {
            const key = app.id || app.firebaseId;
            if (key) uniqueMap.set(key, app);
        });
        
        // Agregar locales (no duplicar)
        localApps.forEach(app => {
            const key = app.id || `local-${app.registrationNumber}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, app);
            }
        });
        
        return Array.from(uniqueMap.values());
    }

    translateAuthError(code) {
        const errors = {
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-email': 'Correo electrónico inválido',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/user-disabled': 'Usuario deshabilitado'
        };
        return errors[code] || 'Error de autenticación';
    }

    // ===== SINCRONIZACIÓN SEGURA =====
    async syncLocalToFirebase() {
        if (!this.firebaseAvailable || !this.db || !this.isInitialized) return;
        
        const localApplicants = this.getLocalApplicants();
        if (localApplicants.length === 0) return;
        
        console.log(`🔄 Sincronizando ${localApplicants.length} inscripciones...`);
        
        let syncedCount = 0;
        for (const applicant of localApplicants) {
            try {
                // Verificar si ya existe en Firebase
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                await addDoc(collection(this.db, 'applicants'), applicant);
                syncedCount++;
            } catch (error) {
                console.warn(`⚠️ No se pudo sincronizar:`, error.message);
            }
        }
        
        console.log(`✅ Sincronizados ${syncedCount}/${localApplicants.length}`);
    }
}

// ===== RADIO BACKEND MANAGER (MANTENER ORIGINAL) =====
class RadioBackendManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            if (window.backendManager) {
                const result = await window.backendManager.initialize();
                if (result.success && window.backendManager.db) {
                    this.db = window.backendManager.db;
                    this.isInitialized = true;
                    console.log("✅ RadioBackendManager inicializado");
                    return { success: true };
                }
            }
            throw new Error("Backend no disponible");
        } catch (error) {
            console.warn("⚠️ Radio en modo local:", error.message);
            return { success: false };
        }
    }

    async saveRadioPlayer(playerData) {
        const playerId = 'player_' + Date.now();
        const playerToSave = {
            ...playerData,
            id: playerId,
            createdAt: new Date().toISOString()
        };

        // Guardar localmente
        const localPlayers = this.getLocalRadioPlayers();
        localPlayers.push(playerToSave);
        localStorage.setItem('radioPlayers', JSON.stringify(localPlayers));

        return { success: true, player: playerToSave };
    }

    getLocalRadioPlayers() {
        const stored = localStorage.getItem('radioPlayers');
        return stored ? JSON.parse(stored) : [];
    }

    async loginRadioAdmin(email, password) {
        // Solo para radio - mantener original
        return { success: false, error: "Sistema de radio no disponible" };
    }
}

// ===== EXPORTAR INSTANCIAS GLOBALES =====
window.backendManager = new BackendManager();
window.radioBackend = new RadioBackendManager();