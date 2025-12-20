// ===== GESTIÓN DEL BACKEND =====

class BackendManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.useLocalStorage = false; // Modo de respaldo
    }

    // ===== INICIALIZACIÓN =====
    async initialize() {
        try {
            // Intentar inicializar Firebase
            const firebaseConfig = window.firebaseConfig;
            if (!firebaseConfig) {
                throw new Error("Configuración de Firebase no encontrada");
            }

            const result = await firebaseConfig.initialize();
            
            if (result.success) {
                this.db = result.db;
                this.auth = result.auth;
                this.isInitialized = true;
                console.log("✅ BackendManager inicializado con Firebase");
                
                // Escuchar cambios en autenticación
                this.auth.onAuthStateChanged((user) => {
                    this.currentUser = user;
                    console.log("👤 Estado de autenticación:", user ? "Conectado" : "Desconectado");
                    
                    // Verificar si era admin del campamento
                    if (user && localStorage.getItem('iamAdminLoggedIn') === 'true') {
                        this.restoreIamAdminSession(user.uid);
                    }
                });
                
                return { success: true, mode: 'firebase' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.warn("⚠️ Firebase no disponible, usando localStorage como respaldo");
            this.useLocalStorage = true;
            return { success: false, mode: 'localstorage', error: error.message };
        }
    }

    // ===== AUTENTICACIÓN PARA CAMPAMENTO IAM =====
    async loginIamAdmin(email, password, adminCode) {
        // Verificar código secreto del campamento
        if (adminCode !== "IAM2026") { // Código del campamento
            return { success: false, error: "Código secreto incorrecto" };
        }
        
        try {
            const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            // Verificar si está en radio_admins para dar permisos
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const adminDoc = await getDoc(doc(this.db, 'radio_admins', user.uid));
            
            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    role: adminDoc.data().role,
                    isIamAdmin: true
                };
                
                // Guardar en localStorage para persistencia
                localStorage.setItem('iamAdminLoggedIn', 'true');
                localStorage.setItem('iamAdminEmail', email);
                localStorage.setItem('iamAdminUID', user.uid);
                
                return { 
                    success: true, 
                    user: this.currentUser
                };
            } else {
                // Cerrar sesión si no es admin
                const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
                await signOut(this.auth);
                
                return { 
                    success: false, 
                    error: "No tienes permisos de administrador" 
                };
            }
        } catch (error) {
            console.error("Error en loginIamAdmin:", error);
            
            // Traducir errores
            const errorMessages = {
                'auth/user-not-found': 'Usuario no encontrado',
                'auth/wrong-password': 'Contraseña incorrecta',
                'auth/invalid-email': 'Email inválido',
                'auth/user-disabled': 'Usuario deshabilitado',
                'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
            };
            
            return { 
                success: false, 
                error: errorMessages[error.code] || 'Error de autenticación' 
            };
        }
    }

    // Restaurar sesión del admin del campamento
    async restoreIamAdminSession(uid) {
        try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const adminDoc = await getDoc(doc(this.db, 'radio_admins', uid));
            
            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                this.currentUser = {
                    uid: uid,
                    email: localStorage.getItem('iamAdminEmail'),
                    role: adminDoc.data().role,
                    isIamAdmin: true
                };
                return true;
            }
        } catch (error) {
            console.error("Error restaurando sesión del campamento:", error);
        }
        return false;
    }

    isIamAdminAuthenticated() {
        // Verificar localStorage primero
        const isLoggedIn = localStorage.getItem('iamAdminLoggedIn') === 'true';
        const adminUID = localStorage.getItem('iamAdminUID');
        
        if (isLoggedIn && adminUID && this.currentUser) {
            return true;
        }
        
        return false;
    }

    logoutIamAdmin() {
        // Limpiar solo las variables del campamento
        localStorage.removeItem('iamAdminLoggedIn');
        localStorage.removeItem('iamAdminEmail');
        localStorage.removeItem('iamAdminUID');
        
        // No cerrar sesión de Firebase completamente (para no afectar radio)
        if (this.currentUser && this.currentUser.isIamAdmin) {
            this.currentUser.isIamAdmin = false;
        }
        
        return { success: true };
    }

    // ===== OPERACIONES CON SOLICITANTES DEL CAMPAMENTO =====
    async saveApplicant(applicantData) {
        // Primero guardar en localStorage (siempre)
        const localApplicants = this.getLocalApplicants();
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
            createdAt: new Date().toISOString()
        };

        // Guardar en localStorage
        localApplicants.push(applicantToSave);
        localStorage.setItem('iamApplicants', JSON.stringify(localApplicants));
        
        // Si Firebase está disponible, guardar también allí
        if (this.isInitialized && !this.useLocalStorage) {
            try {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                await addDoc(collection(this.db, 'applicants'), applicantToSave);
                console.log("✅ Aventurero guardado en Firebase");
            } catch (error) {
                console.warn("⚠️ Error guardando en Firebase:", error.code, error.message);
                
                // Si es error de permisos, solo guardar en localStorage
                if (error.code === 'permission-denied') {
                    console.warn("📝 Solo se guardó en localStorage (sin permisos de Firebase)");
                } else {
                    console.warn("⚠️ No se pudo guardar en Firebase, solo en localStorage");
                }
            }
        }

        return { 
            success: true, 
            id: applicantId,
            registrationNumber: registrationNumber,
            data: applicantToSave 
        };
    }

    async getAllApplicants() {
        // Primero intentar desde Firebase
        if (this.isInitialized && !this.useLocalStorage) {
            try {
                const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const q = query(collection(this.db, 'applicants'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                
                const applicants = [];
                querySnapshot.forEach((doc) => {
                    applicants.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return { success: true, data: applicants, source: 'firebase' };
            } catch (error) {
                console.warn("⚠️ Error cargando de Firebase, usando localStorage");
            }
        }

        // Si Firebase falla o no está disponible, usar localStorage
        const localApplicants = this.getLocalApplicants();
        return { success: true, data: localApplicants, source: 'localstorage' };
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
        // Limpiar localStorage
        localStorage.removeItem('iamApplicants');
        
        // Si Firebase está disponible, limpiar también
        if (this.isInitialized && !this.useLocalStorage) {
            try {
                const { collection, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const querySnapshot = await getDocs(collection(this.db, 'applicants'));
                
                const deletePromises = [];
                querySnapshot.forEach((doc) => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                
                await Promise.all(deletePromises);
                console.log("✅ Todos los datos eliminados de Firebase");
            } catch (error) {
                console.error("❌ Error eliminando datos de Firebase:", error);
            }
        }
        
        return { success: true };
    }

    // ===== FUNCIONES AUXILIARES =====
    getLocalApplicants() {
        const stored = localStorage.getItem('iamApplicants');
        return stored ? JSON.parse(stored) : [];
    }

    getLocalAdmins() {
        // Admins por defecto (modificar según necesidad)
        return [
            { email: "admin@iam.com", password: "admin2026", name: "Administrador Principal" },
            { email: "organizador@iam.com", password: "campamento2026", name: "Organizador" }
        ];
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

    // ===== SINCRONIZACIÓN =====
    async syncLocalToFirebase() {
        if (this.useLocalStorage || !this.isInitialized) return;
        
        const localApplicants = this.getLocalApplicants();
        if (localApplicants.length === 0) return;
        
        console.log(`🔄 Sincronizando ${localApplicants.length} aventureros locales a Firebase...`);
        
        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            for (const applicant of localApplicants) {
                try {
                    await addDoc(collection(this.db, 'applicants'), applicant);
                } catch (error) {
                    console.warn(`⚠️ No se pudo sincronizar aventurero ${applicant.id}:`, error.message);
                }
            }
            
            console.log("✅ Sincronización completada");
        } catch (error) {
            console.error("❌ Error en sincronización:", error);
        }
    }
}

// ===== RADIO BACKEND MANAGER (NO MODIFICAR) =====
class RadioBackendManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            const result = await window.backendManager.initialize();
            if (result.success && result.mode === 'firebase') {
                this.db = window.backendManager.db;
                this.isInitialized = true;
                console.log("✅ RadioBackendManager inicializado con Firebase");
                return { success: true };
            }
            throw new Error("Firebase no disponible");
        } catch (error) {
            console.warn("⚠️ Radio usando localStorage:", error.message);
            return { success: false };
        }
    }

    // ===== JUGADORES =====
    async saveRadioPlayer(playerData) {
        const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const playerToSave = {
            ...playerData,
            id: playerId,
            name: playerData.name || 'Anónimo',
            phone: playerData.phone || '',
            email: playerData.email || '',
            points: 0,
            gamesPlayed: 0,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };

        // 1. Guardar en localStorage (siempre)
        const localPlayers = this.getLocalRadioPlayers();
        localPlayers.push(playerToSave);
        localStorage.setItem('radioPlayers', JSON.stringify(localPlayers));

        // 2. Intentar guardar en Firebase (solo si está inicializado)
        if (this.isInitialized && this.db) {
            try {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                
                // Crear documento en 'radio_players' (allow create: if true)
                const docRef = await addDoc(collection(this.db, 'radio_players'), {
                    name: playerToSave.name,
                    phone: playerToSave.phone,
                    email: playerToSave.email,
                    points: playerToSave.points,
                    gamesPlayed: playerToSave.gamesPlayed,
                    createdAt: playerToSave.createdAt,
                    lastActive: playerToSave.lastActive,
                    localId: playerId  // ID local para referencia
                });
                
                console.log("✅ Jugador guardado en Firebase con ID:", docRef.id);
                playerToSave.firebaseId = docRef.id;
                
            } catch (error) {
                console.warn("⚠️ No se pudo guardar en Firebase, solo en localStorage:", error.message);
            }
        }

        return { 
            success: true, 
            player: playerToSave,
            message: "¡Registrado exitosamente!" 
        };
    }

    async updatePlayerScore(playerId, pointsToAdd) {
        // 1. Actualizar en localStorage
        const localPlayers = this.getLocalRadioPlayers();
        const playerIndex = localPlayers.findIndex(p => p.id === playerId);
        
        if (playerIndex !== -1) {
            localPlayers[playerIndex].points += pointsToAdd;
            localPlayers[playerIndex].gamesPlayed += 1;
            localPlayers[playerIndex].lastActive = new Date().toISOString();
            localStorage.setItem('radioPlayers', JSON.stringify(localPlayers));
        }

        // 2. Si tiene firebaseId y estamos como admin, actualizar en Firebase
        const player = localPlayers[playerIndex];
        if (player && player.firebaseId && this.isInitialized && this.db) {
            try {
                // Esto solo funcionará si el usuario está logueado como admin
                const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                
                await updateDoc(doc(this.db, 'radio_players', player.firebaseId), {
                    points: player.points,
                    gamesPlayed: player.gamesPlayed,
                    lastActive: player.lastActive
                });
                
                console.log("✅ Puntos actualizados en Firebase");
            } catch (error) {
                console.warn("⚠️ No se pudieron actualizar puntos en Firebase:", error.message);
            }
        }
    }

    async getRadioPlayers() {
        // 1. Intentar desde Firebase
        if (this.isInitialized && this.db) {
            try {
                const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                
                const q = query(collection(this.db, 'radio_players'), orderBy('points', 'desc'));
                const querySnapshot = await getDocs(q);
                
                const players = [];
                querySnapshot.forEach((doc) => {
                    players.push({
                        id: doc.id,
                        firebaseId: doc.id,
                        ...doc.data()
                    });
                });
                
                // Combinar con jugadores locales
                const localPlayers = this.getLocalRadioPlayers();
                const allPlayers = this.mergePlayers(players, localPlayers);
                
                return { success: true, data: allPlayers, source: 'firebase' };
            } catch (error) {
                console.warn("⚠️ Error cargando de Firebase:", error.message);
            }
        }

        // 2. Si Firebase falla, usar solo localStorage
        const localPlayers = this.getLocalRadioPlayers();
        return { success: true, data: localPlayers, source: 'localstorage' };
    }

    // ===== JUEGOS =====
    async saveCurrentGame(gameData) {
        if (!this.isInitialized || !this.db) {
            console.warn("⚠️ Firebase no disponible para guardar juego");
            return { success: false, error: "Firebase no disponible" };
        }

        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            // Guardar en 'radio_games/current' (como indican tus reglas)
            await setDoc(doc(this.db, 'radio_games', 'current'), {
                ...gameData,
                id: 'current',
                updatedAt: new Date().toISOString(),
                status: gameData.status || 'waiting'
            });
            
            console.log("✅ Juego actual guardado en Firebase");
            return { success: true };
            
        } catch (error) {
            console.error("❌ Error guardando juego:", error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentGame() {
        if (!this.isInitialized || !this.db) {
            return { success: false, data: null };
        }

        try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            const gameDoc = await getDoc(doc(this.db, 'radio_games', 'current'));
            
            if (gameDoc.exists()) {
                return { success: true, data: gameDoc.data() };
            } else {
                return { success: true, data: null };
            }
            
        } catch (error) {
            console.warn("⚠️ Error obteniendo juego actual:", error.message);
            return { success: false, data: null };
        }
    }

    // ===== ADMIN AUTH =====
    async loginRadioAdmin(email, password) {
        // Solo usar Firebase Auth, nada de modo local
        if (!this.isInitialized || !window.backendManager.auth) {
            return { 
                success: false, 
                error: "Firebase no disponible. Revisa tu conexión." 
            };
        }
    
        try {
            const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            const userCredential = await signInWithEmailAndPassword(window.backendManager.auth, email, password);
            
            const user = userCredential.user;
            
            // Verificar si el usuario existe en radio_admins
            try {
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const adminDoc = await getDoc(doc(this.db, 'radio_admins', user.uid));
                
                if (adminDoc.exists()) {
                    // Es un admin válido
                    localStorage.setItem('radioAdminLoggedIn', 'true');
                    localStorage.setItem('radioAdminEmail', email);
                    localStorage.setItem('radioAdminUID', user.uid);
                    
                    return { 
                        success: true, 
                        user: user,
                        adminData: adminDoc.data()
                    };
                } else {
                    // Usuario existe pero no está en radio_admins
                    return { 
                        success: false, 
                        error: "No tienes permisos de administrador" 
                    };
                }
                
            } catch (firestoreError) {
                console.error("Error verificando admin:", firestoreError);
                return { 
                    success: false, 
                    error: "Error verificando permisos" 
                };
            }
            
        } catch (authError) {
            console.error("Error de autenticación:", authError);
            
            // Traducir errores comunes
            const errorMessages = {
                'auth/user-not-found': 'Usuario no encontrado',
                'auth/wrong-password': 'Contraseña incorrecta',
                'auth/invalid-email': 'Email inválido',
                'auth/user-disabled': 'Usuario deshabilitado',
                'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
            };
            
            return { 
                success: false, 
                error: errorMessages[authError.code] || 'Error de autenticación' 
            };
        }
    }

    isRadioAdminLoggedIn() {
        return localStorage.getItem('radioAdminLoggedIn') === 'true';
    }

    logoutRadioAdmin() {
        localStorage.removeItem('radioAdminLoggedIn');
        localStorage.removeItem('radioAdminEmail');
        localStorage.removeItem('radioAdminUID');
        return { success: true };
    }

    // ===== FUNCIONES AUXILIARES =====
    getLocalRadioPlayers() {
        const stored = localStorage.getItem('radioPlayers');
        return stored ? JSON.parse(stored) : [];
    }

    mergePlayers(firebasePlayers, localPlayers) {
        const merged = [...firebasePlayers];
        
        // Agregar jugadores locales que no estén en Firebase
        localPlayers.forEach(localPlayer => {
            if (!merged.some(p => p.localId === localPlayer.id)) {
                merged.push({
                    ...localPlayer,
                    id: localPlayer.firebaseId || localPlayer.id,
                    localId: localPlayer.id
                });
            }
        });
        
        // Ordenar por puntos
        return merged.sort((a, b) => (b.points || 0) - (a.points || 0));
    }

    async syncLocalToFirebase() {
        if (!this.isInitialized || !this.db) return;
        
        const localPlayers = this.getLocalRadioPlayers();
        if (localPlayers.length === 0) return;
        
        console.log(`🔄 Sincronizando ${localPlayers.length} jugadores locales...`);
        
        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            for (const player of localPlayers) {
                // Solo sincronizar si no tiene firebaseId
                if (!player.firebaseId) {
                    try {
                        const docRef = await addDoc(collection(this.db, 'radio_players'), {
                            name: player.name,
                            phone: player.phone || '',
                            email: player.email || '',
                            points: player.points || 0,
                            gamesPlayed: player.gamesPlayed || 0,
                            createdAt: player.createdAt || new Date().toISOString(),
                            lastActive: player.lastActive || new Date().toISOString(),
                            localId: player.id
                        });
                        
                        // Actualizar localmente con el firebaseId
                        player.firebaseId = docRef.id;
                    } catch (error) {
                        console.warn(`⚠️ No se pudo sincronizar jugador ${player.name}:`, error.message);
                    }
                }
            }
            
            // Guardar de vuelta en localStorage con los firebaseIds
            localStorage.setItem('radioPlayers', JSON.stringify(localPlayers));
            
            console.log("✅ Sincronización completada");
        } catch (error) {
            console.error("❌ Error en sincronización:", error);
        }
    }
}

// Crear instancias globales
window.backendManager = new BackendManager();
window.radioBackend = new RadioBackendManager();