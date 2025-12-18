// radio-firebase.js
// ===== MANEJO DE FIREBASE PARA LA RADIO (VERSIÓN MODULAR GLOBAL) =====

class RadioFirebaseManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.rtdb = null;
        this.currentUser = null;
        this.unsubscribes = [];
        this.collections = {
            RADIO_ADMINS: 'radio_admins',
            RADIO_GAMES: 'radio_games',
            RADIO_PLAYERS: 'radio_players'
        };
    }
    
    async initialize() {
        try {
            // Verificar que Firebase esté cargado
            if (!window.firebaseApp || !window.firebaseFunctions) {
                throw new Error("Firebase no se inicializó. Revisa la carga en radio.html");
            }
            
            this.db = window.firebaseDb;
            this.auth = window.firebaseAuth;
            this.rtdb = window.firebaseRTDB;
            
            console.log("✅ RadioFirebaseManager inicializado");
            
            // Escuchar cambios en autenticación
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.onAuthStateChanged(user);
            });
            
            return { success: true };
            
        } catch (error) {
            console.error("❌ Error inicializando RadioFirebaseManager:", error);
            return { success: false, error: error.message };
        }
    }
    
    onAuthStateChanged(user) {
        if (user) {
            console.log("🔓 Usuario autenticado:", user.email);
            // Verificar si es admin
            this.checkIfUserIsAdmin(user.uid);
        } else {
            console.log("🔒 Usuario no autenticado");
            // Limpiar listeners
            this.unsubscribes.forEach(unsub => unsub());
            this.unsubscribes = [];
            
            // Actualizar estado local
            window.radio.admin.logged = false;
            window.radio.admin.username = null;
            window.radio.admin.userId = null;
        }
    }
    
    async checkIfUserIsAdmin(userId) {
        try {
            // Usar funciones globales de Firebase
            const adminDoc = await window.firebaseFunctions.getDoc(
                window.firebaseFunctions.doc(this.db, this.collections.RADIO_ADMINS, userId)
            );
            
            if (adminDoc.exists()) {
                console.log("✅ Usuario confirmado como admin");
                
                // Actualizar estado global
                window.radio.admin.logged = true;
                window.radio.admin.userId = userId;
                window.radio.admin.username = adminDoc.data().email;
                
                // Mostrar panel admin
                this.showAdminPanel();
                this.setupRealtimeListeners();
                
            } else {
                console.log("⚠️ Usuario no es admin de radio");
                window.radio.admin.logged = false;
            }
        } catch (error) {
            console.error("Error verificando admin:", error);
        }
    }
    
    async loginAdmin(email, password, adminCode) {
        try {
            // Verificar código primero
            if (adminCode !== "IAM2026") {
                return { success: false, message: "Código secreto incorrecto" };
            }
            
            // Iniciar sesión con Firebase Auth usando función global
            const userCredential = await window.firebaseFunctions.signInWithEmailAndPassword(
                this.auth, email, password
            );
            
            return { success: true, user: userCredential.user };
            
        } catch (error) {
            console.error("Error en login:", error);
            let message = "Error de autenticación";
            
            switch(error.code) {
                case 'auth/user-not-found':
                    message = "Usuario no encontrado";
                    break;
                case 'auth/wrong-password':
                    message = "Contraseña incorrecta";
                    break;
                case 'auth/invalid-email':
                    message = "Correo inválido";
                    break;
                case 'auth/too-many-requests':
                    message = "Demasiados intentos. Intenta más tarde";
                    break;
            }
            
            return { success: false, message };
        }
    }
    
    async logoutAdmin() {
        try {
            // Usar función global para cerrar sesión
            await window.firebaseFunctions.signOut(this.auth);
            return { success: true };
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== GESTIÓN DE JUEGOS =====
    async startGame(gameType, config = {}) {
        const gameData = {
            activeGame: gameType,
            status: 'waiting',
            config: config,
            startTime: new Date().toISOString(),
            currentQuestion: 0,
            createdBy: this.currentUser.uid,
            createdAt: new Date().toISOString()
        };
        
        try {
            // Guardar en Firestore
            await window.firebaseFunctions.setDoc(
                window.firebaseFunctions.doc(this.db, this.collections.RADIO_GAMES, 'current'), 
                gameData
            );
            
            // También en Realtime Database para actualizaciones en tiempo real
            await window.firebaseFunctions.set(
                window.firebaseFunctions.ref(this.rtdb, 'radio/gameStatus'), 
                gameData
            );
            
            // Limpiar jugadores anteriores en Realtime DB
            await window.firebaseFunctions.set(
                window.firebaseFunctions.ref(this.rtdb, 'radio/currentPlayers'), 
                {}
            );
            
            console.log("✅ Juego iniciado:", gameType);
            return { success: true };
            
        } catch (error) {
            console.error("❌ Error iniciando juego:", error);
            return { success: false, error: error.message };
        }
    }
    
    async updateGameStatus(status, data = {}) {
        try {
            const updateData = { 
                status, 
                ...data, 
                updatedAt: new Date().toISOString() 
            };
            
            // Actualizar en Firestore
            await window.firebaseFunctions.updateDoc(
                window.firebaseFunctions.doc(this.db, this.collections.RADIO_GAMES, 'current'), 
                updateData
            );
            
            // Actualizar en Realtime Database
            await window.firebaseFunctions.update(
                window.firebaseFunctions.ref(this.rtdb, 'radio/gameStatus'), 
                updateData
            );
            
            console.log("✅ Estado del juego actualizado:", status);
            return { success: true };
            
        } catch (error) {
            console.error("❌ Error actualizando juego:", error);
            return { success: false, error: error.message };
        }
    }
    
    async registerPlayer(playerData) {
        try {
            const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const fullPlayerData = {
                ...playerData,
                id: playerId,
                registeredAt: new Date().toISOString(),
                currentScore: 0,
                gameId: 'current'
            };
            
            // Guardar en Realtime Database para tiempo real
            await window.firebaseFunctions.set(
                window.firebaseFunctions.ref(this.rtdb, `radio/currentPlayers/${playerId}`), 
                fullPlayerData
            );
            
            // También guardar en Firestore para persistencia
            await window.firebaseFunctions.setDoc(
                window.firebaseFunctions.doc(this.db, this.collections.RADIO_PLAYERS, playerId), 
                fullPlayerData
            );
            
            console.log("✅ Jugador registrado:", playerData.name);
            return { success: true, playerId };
            
        } catch (error) {
            console.error("❌ Error registrando jugador:", error);
            return { success: false, error: error.message };
        }
    }
    
    async updatePlayerScore(playerId, score) {
        try {
            // Actualizar en tiempo real
            await window.firebaseFunctions.update(
                window.firebaseFunctions.ref(this.rtdb, `radio/currentPlayers/${playerId}`), 
                {
                    currentScore: score,
                    lastUpdate: new Date().toISOString()
                }
            );
            
            // También actualizar en Firestore
            const playerRef = window.firebaseFunctions.doc(this.db, this.collections.RADIO_PLAYERS, playerId);
            await window.firebaseFunctions.updateDoc(playerRef, {
                currentScore: score,
                lastUpdate: new Date().toISOString()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error("❌ Error actualizando puntaje:", error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== LISTENERS EN TIEMPO REAL =====
    setupRealtimeListeners() {
        // Escuchar estado del juego
        const gameStatusRef = window.firebaseFunctions.ref(this.rtdb, 'radio/gameStatus');
        const gameStatusUnsub = window.firebaseFunctions.onValue(gameStatusRef, (snapshot) => {
            const gameData = snapshot.val();
            if (gameData) {
                this.onGameStatusChanged(gameData);
            }
        });
        
        // Escuchar jugadores
        const playersRef = window.firebaseFunctions.ref(this.rtdb, 'radio/currentPlayers');
        const playersUnsub = window.firebaseFunctions.onValue(playersRef, (snapshot) => {
            const players = snapshot.val();
            this.onPlayersChanged(players);
        });
        
        this.unsubscribes.push(() => {
            // Estas funciones de limpieza se llamarán al cerrar sesión
            gameStatusUnsub();
            playersUnsub();
        });
        
        console.log("✅ Listeners de tiempo real activados");
    }
    
    onGameStatusChanged(gameData) {
        console.log("🔄 Estado del juego cambiado:", gameData.status);
        
        // Actualizar estado local
        window.radio.games.active = gameData.activeGame;
        window.radio.games.status = gameData.status;
        window.radio.games.pointsPerQuestion = gameData.config?.pointsPerQuestion || 200;
        
        // Actualizar UI según estado del juego
        const gameStatus = document.getElementById('currentGameStatus');
        const gameCards = document.querySelectorAll('.game-card');
        
        switch(gameData.status) {
            case 'waiting':
                if (gameStatus) {
                    gameStatus.textContent = `⏳ ESPERANDO JUGADORES: ${this.getGameName(gameData.activeGame)}`;
                    gameStatus.style.color = 'var(--warning)';
                }
                this.updateGameCards(gameData.activeGame, true);
                break;
                
            case 'active':
                if (gameStatus) {
                    gameStatus.textContent = `🎮 JUGANDO: ${this.getGameName(gameData.activeGame)}`;
                    gameStatus.style.color = 'var(--success)';
                }
                this.updateGameCards(gameData.activeGame, false);
                break;
                
            case 'finished':
                if (gameStatus) {
                    gameStatus.textContent = '🏁 Juego terminado';
                    gameStatus.style.color = 'var(--text-light)';
                }
                this.updateGameCards(null, false);
                break;
        }
    }
    
    onPlayersChanged(players) {
        const playerCount = players ? Object.keys(players).length : 0;
        
        // Actualizar contador en admin panel
        const playerCountElement = document.getElementById('playerCount');
        if (playerCountElement) {
            playerCountElement.textContent = `Jugadores conectados: ${playerCount}`;
        }
        
        console.log(`👥 Jugadores actualizados: ${playerCount}`);
        
        // Guardar jugadores localmente para uso rápido
        if (players) {
            window.radio.games.currentPlayers = Object.values(players);
        } else {
            window.radio.games.currentPlayers = [];
        }
    }
    
    updateGameCards(gameType, isActive) {
        const gameCards = document.querySelectorAll('.game-card');
        
        gameCards.forEach(card => {
            if (isActive && card.dataset.game === gameType) {
                // Desbloquear este juego
                card.classList.remove('locked');
                const status = card.querySelector('.game-status');
                if (status) {
                    status.innerHTML = '<i class="fas fa-unlock"></i> ACTIVO';
                    status.classList.remove('locked');
                    status.classList.add('active');
                }
                
                const button = card.querySelector('button');
                if (button) {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.innerHTML = '<i class="fas fa-gamepad"></i> ¡Únete al juego!';
                    // Asegurar que el onclick esté bien configurado
                    button.onclick = function() {
                        if (typeof window.registerForGame === 'function') {
                            window.registerForGame();
                        } else {
                            console.error("❌ window.registerForGame no está disponible");
                            // Alternativa: mostrar un mensaje o recargar
                            alert("Por favor, recarga la página para unirte al juego");
                        }
                    };
                }
                
            } else {
                // Bloquear
                if (!card.classList.contains('locked')) {
                    card.classList.add('locked');
                    const status = card.querySelector('.game-status');
                    if (status) {
                        status.innerHTML = '<i class="fas fa-lock"></i> BLOQUEADO';
                        status.classList.add('locked');
                        status.classList.remove('active');
                    }
                    
                    const button = card.querySelector('button');
                    if (button) {
                        button.disabled = true;
                        button.style.opacity = '0.5';
                        button.innerHTML = 'Esperando al animador...';
                        button.onclick = null;
                    }
                }
            }
        });
    }
    
    getGameName(gameType) {
        const names = {
            quiz: 'Quiz Misionero',
            memory: 'Memoria Bíblica',
            trivia: 'Trivia IAM',
            wordsearch: 'Sopa de Letras'
        };
        return names[gameType] || gameType;
    }
    
    showAdminPanel() {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = 'block';
            console.log("✅ Panel admin mostrado");
        }
    }
}

// Exportar para uso global
window.RadioFirebaseManager = RadioFirebaseManager;
window.radioFirebase = new RadioFirebaseManager();

console.log("📻 RadioFirebaseManager cargado");