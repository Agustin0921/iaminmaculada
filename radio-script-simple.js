// ===== RADIO MORENITA DEL VALLE - SISTEMA COMPLETO CON FIREBASE =====
// Versión 5.0 - Sistema real con Firebase Backend

document.addEventListener('DOMContentLoaded', async function() {
    console.log("📻 Sistema de Radio con Firebase iniciando...");
    
    // Estado global con Firebase
    window.radio = {
        isPlaying: false,
        currentStream: 'youtube',
        games: {
            active: null,
            currentPlayers: [],
            currentQuestion: 0,
            questions: [],
            status: 'idle', // idle, waiting, active, finished
            timer: null,
            timeLeft: 30,
            minPlayers: 3, // Mínimo de jugadores para iniciar (reducido para pruebas)
            pointsPerQuestion: 200
        },
        admin: {
            logged: false,
            username: null,
            userId: null
        },
        // Configuración del mes actual
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        ranking: [] // Ranking mensual acumulado
    };
    
    // Inicializar Firebase Manager
    await initFirebaseSystem();
    
    // Inicializar sistemas
    initRadioSystem();
    initAdminSystem();
    initGamesSystem();
    
    // Cargar preguntas
    loadQuizQuestions();
    
    console.log("✅ Sistema completo inicializado");
});

// ===== INICIALIZACIÓN DE FIREBASE =====
async function initFirebaseSystem() {
    console.log("🔥 Inicializando sistema Firebase...");
    
    // Verificar si Firebase Manager está disponible
    if (!window.radioFirebase) {
        console.error("❌ RadioFirebaseManager no está cargado");
        showRadioNotification('Error de sistema', 'No se pudo inicializar el sistema de radio', 'error');
        return;
    }
    
    // Inicializar Firebase Manager
    const result = await window.radioFirebase.initialize();
    
    if (!result.success) {
        console.error("❌ Error inicializando Firebase Manager");
        showRadioNotification('Error de conexión', 'No se pudo conectar con el servidor en tiempo real', 'error');
        // Continuar en modo local
    } else {
        console.log("✅ Firebase Manager inicializado correctamente");
    }
}

// ===== SISTEMA DE ADMIN CON FIREBASE =====
function initAdminSystem() {
    console.log("🔐 Inicializando sistema admin...");
    
    const adminBtn = document.getElementById('radioAdminBtn');
    const loginModal = document.getElementById('radioLoginModal');
    const cancelLogin = document.getElementById('cancelRadioLogin');
    const loginForm = document.getElementById('radioLoginForm');
    
    if (!adminBtn) return;
    
    // Configurar botón admin
    adminBtn.addEventListener('click', function() {
        if (window.radio.admin.logged) {
            if (confirm('¿Cerrar sesión de animador?')) {
                if (window.radioFirebase && window.radioFirebase.logoutAdmin) {
                    window.radioFirebase.logoutAdmin();
                } else {
                    logoutAdminLocal();
                }
            }
        } else {
            if (loginModal) {
                loginModal.style.display = 'flex';
                // Limpiar formulario
                if (loginForm) loginForm.reset();
            }
        }
    });
    
    // Configurar cierre del modal
    if (cancelLogin) {
        cancelLogin.addEventListener('click', function() {
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
        });
    }
    
    // Configurar formulario de login
    if (loginForm) {
        // REMOVER EJEMPLOS DE INPUTS
        const usernameInput = document.getElementById('radioUsername');
        const passwordInput = document.getElementById('radioPassword');
        const codeInput = document.getElementById('radioAdminCode');
        
        if (usernameInput) usernameInput.placeholder = "Correo electrónico admin";
        if (passwordInput) passwordInput.placeholder = "Contraseña";
        if (codeInput) codeInput.placeholder = "Código de acceso IAM2026";
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const email = document.getElementById('radioUsername').value.trim();
            const password = document.getElementById('radioPassword').value;
            const adminCode = document.getElementById('radioAdminCode').value;
            
            // Verificar código IAM primero
            if (adminCode !== "IAM2026") {
                showRadioNotification('Error de acceso', 'Código secreto incorrecto', 'error');
                return;
            }
            
            // Si tenemos Firebase Manager, usarlo
            if (window.radioFirebase && window.radioFirebase.loginAdmin) {
                const result = await window.radioFirebase.loginAdmin(email, password, adminCode);
                
                if (result.success) {
                    // Login exitoso
                    window.radio.admin.logged = true;
                    window.radio.admin.username = email;
                    
                    // Cerrar modal
                    loginModal.style.display = 'none';
                    loginForm.reset();
                    
                    showRadioNotification('¡Acceso concedido!', `Bienvenido ${email}`, 'success');
                    
                } else {
                    showRadioNotification('Error de acceso', result.message, 'error');
                }
                
            } else {
                // Modo local (fallback)
                const isValid = validateAdminCredentialsLocal(email, password, adminCode);
                
                if (isValid) {
                    // Login exitoso local
                    window.radio.admin.logged = true;
                    window.radio.admin.username = email;
                    
                    // Cerrar modal
                    loginModal.style.display = 'none';
                    loginForm.reset();
                    
                    // Mostrar panel
                    showAdminPanel();
                    updateAdminButton(true);
                    
                    showRadioNotification('¡Acceso concedido!', `Bienvenido ${email}`, 'success');
                    
                } else {
                    showRadioNotification('Error de acceso', 'Credenciales incorrectas', 'error');
                }
            }
        });
    }
    
    // Cerrar modal al hacer clic fuera
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
                if (loginForm) loginForm.reset();
            }
        });
    }
}

function validateAdminCredentialsLocal(email, password, adminCode) {
    // SOLO para desarrollo/emergencia - NO USAR EN PRODUCCIÓN
    // En producción, solo Firebase debe manejar las credenciales
    const validCredentials = [
        { email: 'admin@example.com', password: 'admin123', code: 'IAM2026' }
    ];
    
    return validCredentials.some(cred => 
        cred.email === email && 
        cred.password === password && 
        cred.code === adminCode
    );
}

function logoutAdminLocal() {
    // Reemplaza TODO el contenido de esta función por esto:
    if (window.radioFirebase && window.radioFirebase.logoutAdmin) {
        window.radioFirebase.logoutAdmin().then(result => {
            if (result.success) {
                window.radio.admin.logged = false;
                window.radio.admin.username = null;
                window.radio.admin.userId = null;
                
                // Ocultar panel admin
                const adminPanel = document.getElementById('adminPanel');
                if (adminPanel) {
                    adminPanel.style.display = 'none';
                }
                
                updateAdminButton(false);
                showRadioNotification('Sesión cerrada', 'Has salido del panel de animador', 'info');
            }
        });
    }
}

function updateAdminButton(isLogged) {
    const adminBtn = document.getElementById('radioAdminBtn');
    if (!adminBtn) return;
    
    const icon = adminBtn.querySelector('i');
    if (icon) {
        if (isLogged) {
            icon.className = 'fas fa-sign-out-alt';
            adminBtn.title = "Cerrar sesión de animador";
            adminBtn.style.background = 'var(--success)';
        } else {
            icon.className = 'fas fa-user-shield';
            adminBtn.title = "Acceso Animadores";
            adminBtn.style.background = '';
        }
    }
}

function showAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel && window.radio.admin.logged) {
        adminPanel.style.display = 'block';
    }
}

// ===== SISTEMA DE REGISTRO PARA PARTICIPANTES =====
window.registerForGame = function() {
    // Verificar si hay juego activo
    if (!window.radio.admin.logged && (!window.radio.games.active || window.radio.games.status !== 'waiting')) {
        showRadioNotification('No hay juego activo', 'Espera a que el animador inicie un juego', 'warning');
        return;
    }
    
    // Mostrar modal de registro
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--primary);">
                    <i class="fas fa-user-plus"></i> Registro para Juego
                </h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form id="playerRegisterForm" onsubmit="return submitPlayerRegistration(this)">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-dark); font-weight: 500;">
                        <i class="fas fa-user"></i> Nombre Completo *
                    </label>
                    <input type="text" name="playerName" required 
                           style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px;"
                           placeholder="Ej: Juan Pérez">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-dark); font-weight: 500;">
                        <i class="fas fa-envelope"></i> Correo Electrónico *
                    </label>
                    <input type="email" name="playerEmail" required 
                           style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px;"
                           placeholder="Ej: juan@ejemplo.com">
                </div>
                
                <div style="background: var(--bg-light); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: var(--text-light); font-size: 0.9rem; margin: 0;">
                        <i class="fas fa-info-circle"></i> Al registrarte acumulas puntos para el ranking mensual. 
                        Tu información se guardará en nuestros servidores seguros.
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-gamepad"></i> Unirme al Juego
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

async function submitPlayerRegistration(form) {
    const name = form.playerName.value.trim();
    const email = form.playerEmail.value.trim();
    
    if (!name || !email) {
        showRadioNotification('Datos incompletos', 'Por favor completa todos los campos', 'error');
        return false;
    }
    
    const playerData = {
        name: name,
        email: email,
        registeredDate: new Date().toISOString()
    };
    
    // Intentar registrar en Firebase primero
    if (window.radioFirebase && window.radioFirebase.registerPlayer) {
        try {
            const result = await window.radioFirebase.registerPlayer(playerData);
            
            if (result.success) {
                // Cerrar modal
                form.closest('.modal').remove();
                
                showRadioNotification('¡Registro exitoso!', `${name} se ha unido al juego`, 'success');
                
                // Agregar a jugadores locales también
                const currentPlayer = {
                    ...playerData,
                    id: result.playerId,
                    currentScore: 0,
                    answered: false,
                    currentAnswer: null,
                    responseTime: null
                };
                
                window.radio.games.currentPlayers.push(currentPlayer);
                
                // Actualizar contador
                updatePlayerCounter();
                
                return false;
            }
        } catch (error) {
            console.warn("⚠️ Error registrando en Firebase, usando modo local");
        }
    }
    
    // Modo local (fallback)
    const playerId = 'player_' + Date.now();
    
    const localPlayerData = {
        id: playerId,
        ...playerData,
        totalPoints: 0,
        gamesPlayed: 0
    };
    
    // Agregar a jugadores registrados si es nuevo
    const existingPlayer = window.radio.games.registeredPlayers?.find(
        p => p.email.toLowerCase() === email.toLowerCase()
    ) || window.radio.games.currentPlayers?.find(
        p => p.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!existingPlayer) {
        if (!window.radio.games.registeredPlayers) window.radio.games.registeredPlayers = [];
        window.radio.games.registeredPlayers.push(localPlayerData);
        saveRegisteredPlayersLocal();
    }
    
    // Agregar al juego actual
    const currentPlayer = {
        ...localPlayerData,
        currentScore: 0,
        answered: false,
        currentAnswer: null,
        responseTime: null
    };
    
    if (!window.radio.games.currentPlayers) window.radio.games.currentPlayers = [];
    window.radio.games.currentPlayers.push(currentPlayer);
    
    // Actualizar contador
    updatePlayerCounter();
    
    // Cerrar modal
    form.closest('.modal').remove();
    
    showRadioNotification('¡Registro exitoso!', `${name} se ha unido al juego`, 'success');
    
    return false;
}

function saveRegisteredPlayersLocal() {
    try {
        localStorage.setItem('radio_registered_players', 
            JSON.stringify(window.radio.games.registeredPlayers || []));
    } catch (error) {
        console.warn("⚠️ Error guardando jugadores registrados localmente");
    }
}

// ===== SISTEMA DE JUEGOS EN TIEMPO REAL =====
function initGamesSystem() {
    console.log("🎮 Inicializando sistema de juegos...");
    
    // Botones de control
    const startBtn = document.getElementById('startGameBtn');
    const stopBtn = document.getElementById('stopGameBtn');
    const resetBtn = document.getElementById('resetGameBtn');
    const resultsBtn = document.getElementById('viewResultsBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            if (!window.radio.admin.logged) {
                showRadioNotification('Acceso denegado', 'Solo el animador puede iniciar juegos', 'error');
                return;
            }
            
            const selectedGame = document.querySelector('.game-card.active');
            if (!selectedGame) {
                showRadioNotification('Selecciona un juego', 'Primero elige un juego del panel', 'warning');
                return;
            }
            
            const gameType = selectedGame.dataset.game;
            
            // Preguntar configuración del juego
            showGameConfiguration(gameType);
        });
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopGame);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetGame);
    }
    
    if (resultsBtn) {
        resultsBtn.addEventListener('click', showMonthlyRanking);
    }
    
    // Configurar selección de juegos (solo para admin)
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', function() {
            if (!window.radio.admin.logged) {
                showRadioNotification('Acceso restringido', 'Solo el animador puede seleccionar juegos', 'warning');
                return;
            }
            
            // Deseleccionar otros
            gameCards.forEach(c => c.classList.remove('active'));
            
            // Seleccionar este
            this.classList.add('active');
            window.radio.games.active = this.dataset.game;
            
            const gameStatus = document.getElementById('currentGameStatus');
            if (gameStatus) {
                gameStatus.textContent = `Juego seleccionado: ${getGameName(window.radio.games.active)}`;
                gameStatus.style.color = 'var(--primary)';
            }
            
            showRadioNotification('Juego seleccionado', `${getGameName(window.radio.games.active)} listo para iniciar`);
        });
    });
}

function showGameConfiguration(gameType) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--primary);">
                    <i class="fas fa-cog"></i> Configurar Juego
                </h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--secondary); margin-bottom: 15px;">
                    ${getGameName(gameType)}
                </h4>
                
                <div style="background: var(--bg-light); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-users" style="color: var(--primary);"></i>
                        <div>
                            <div style="font-weight: 500; color: var(--text-dark);">Mínimo de jugadores</div>
                            <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">
                                ${window.radio.games.minPlayers}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-clock" style="color: var(--primary);"></i>
                        <div>
                            <div style="font-weight: 500; color: var(--text-dark);">Tiempo por pregunta</div>
                            <div style="font-size: 1.2rem; font-weight: bold; color: var(--secondary);">
                                30 segundos
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">
                        <i class="fas fa-trophy"></i> Puntos por respuesta correcta
                    </label>
                    <select id="pointsPerQuestion" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px;">
                        <option value="100">100 puntos</option>
                        <option value="200" selected>200 puntos</option>
                        <option value="300">300 puntos</option>
                        <option value="500">500 puntos</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn btn-primary" onclick="startConfiguredGame('${gameType}')">
                    <i class="fas fa-play"></i> Iniciar Juego
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function startConfiguredGame(gameType) {
    const pointsSelect = document.getElementById('pointsPerQuestion');
    const pointsPerQuestion = pointsSelect ? parseInt(pointsSelect.value) : 200;
    
    // Cerrar modal de configuración
    document.querySelector('.modal').remove();
    
    // Iniciar juego
    startGame(gameType, pointsPerQuestion);
}

async function startGame(gameType, pointsPerQuestion = 200) {
    if (!window.radio.admin.logged) {
        showRadioNotification('Acceso denegado', 'Solo el animador puede iniciar juegos', 'error');
        return;
    }
    
    // Si tenemos Firebase, usarlo
    if (window.radioFirebase && window.radioFirebase.startGame) {
        const config = {
            pointsPerQuestion: pointsPerQuestion,
            timePerQuestion: 30,
            minPlayers: window.radio.games.minPlayers
        };
        
        const result = await window.radioFirebase.startGame(gameType, config);
        
        if (result.success) {
            // Actualizar estado local
            window.radio.games.active = gameType;
            window.radio.games.status = 'waiting';
            window.radio.games.currentQuestion = 0;
            window.radio.games.pointsPerQuestion = pointsPerQuestion;
            window.radio.games.currentPlayers = [];
            
            const gameStatus = document.getElementById('currentGameStatus');
            if (gameStatus) {
                gameStatus.textContent = `⏳ ESPERANDO JUGADORES: ${getGameName(gameType)}`;
                gameStatus.style.color = 'var(--warning)';
            }
            
            showRadioNotification('¡Juego listo!', 'Los oyentes pueden registrarse para participar', 'success');
            
            // Desbloquear juego para jugadores
            updateGameCardsForPlayers(gameType, true);
            
        } else {
            showRadioNotification('Error', 'No se pudo iniciar el juego', 'error');
        }
        
    } else {
        // Modo local (fallback)
        // Resetear jugadores actuales
        window.radio.games.currentPlayers = [];
        window.radio.games.status = 'waiting';
        window.radio.games.currentQuestion = 0;
        window.radio.games.pointsPerQuestion = pointsPerQuestion;
        window.radio.games.active = gameType;
        
        const gameStatus = document.getElementById('currentGameStatus');
        if (gameStatus) {
            gameStatus.textContent = `⏳ ESPERANDO JUGADORES: ${getGameName(gameType)}`;
            gameStatus.style.color = 'var(--warning)';
        }
        
        showRadioNotification('¡Juego listo!', 'Los oyentes pueden registrarse para participar', 'success');
        
        // Desbloquear juego para jugadores
        updateGameCardsForPlayers(gameType, true);
    }
}

function updateGameCardsForPlayers(gameType, isActive) {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        if (isActive && card.dataset.game === gameType) {
            // Desbloquear este juego específico
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
                button.onclick = function() { registerForGame(); };
            }
            
        } else {
            // Bloquear otros juegos
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

async function stopGame() {
    if (!window.radio.admin.logged) {
        showRadioNotification('Acceso denegado', 'Solo el animador puede detener juegos', 'error');
        return;
    }
    
    // Si tenemos Firebase, usarlo
    if (window.radioFirebase && window.radioFirebase.updateGameStatus) {
        const result = await window.radioFirebase.updateGameStatus('finished');
        
        if (result.success) {
            // Actualizar estado local
            window.radio.games.active = null;
            window.radio.games.status = 'idle';
            
            clearInterval(window.radio.games.timer);
            clearInterval(window.waitingRoomInterval);
            
            const gameStatus = document.getElementById('currentGameStatus');
            if (gameStatus) {
                gameStatus.textContent = '⏹️ No hay juego activo';
                gameStatus.style.color = 'var(--text-light)';
            }
            
            const gameModal = document.getElementById('gameModal');
            if (gameModal) {
                gameModal.style.display = 'none';
            }
            
            // Bloquear juegos para jugadores
            updateGameCardsForPlayers(null, false);
            
            showRadioNotification('Juego terminado', 'El juego ha sido finalizado', 'info');
        }
        
    } else {
        // Modo local
        window.radio.games.active = null;
        window.radio.games.status = 'idle';
        
        clearInterval(window.radio.games.timer);
        clearInterval(window.waitingRoomInterval);
        
        const gameStatus = document.getElementById('currentGameStatus');
        if (gameStatus) {
            gameStatus.textContent = '⏹️ No hay juego activo';
            gameStatus.style.color = 'var(--text-light)';
        }
        
        const gameModal = document.getElementById('gameModal');
        if (gameModal) {
            gameModal.style.display = 'none';
        }
        
        // Bloquear juegos para jugadores
        updateGameCardsForPlayers(null, false);
        
        showRadioNotification('Juego terminado', 'El juego ha sido finalizado', 'info');
    }
}

function resetGame() {
    if (!window.radio.admin.logged) return;
    
    if (window.radio.games.active) {
        if (confirm('¿Reiniciar el juego actual? Se perderán todos los progresos.')) {
            // Reiniciar juego actual
            startGame(window.radio.games.active, window.radio.games.pointsPerQuestion);
        }
    } else {
        showRadioNotification('No hay juego', 'Primero inicia un juego', 'warning');
    }
}

// ===== FUNCIONES DE INTERFAZ Y UTILIDAD =====
function updatePlayerCounter() {
    const playerCount = document.getElementById('playerCount');
    if (playerCount) {
        const activePlayers = window.radio.games.currentPlayers?.length || 0;
        playerCount.textContent = `Jugadores conectados: ${activePlayers}`;
        
        if (activePlayers > 0) {
            playerCount.style.color = 'var(--success)';
        } else {
            playerCount.style.color = 'inherit';
        }
    }
}

function loadQuizQuestions() {
    window.radio.games.questions = [
        {
            question: "¿Qué significa IAM?",
            options: [
                "Infancia y Adolescencia Misionera",
                "Iglesia Argentina Misionera", 
                "Infancia Amorosa Misionera",
                "Iglesia Americana Misionera"
            ],
            correct: 0,
            time: 30
        },
        {
            question: "¿En qué año se fundó la IAM?",
            options: ["1843", "1900", "1950", "2000"],
            correct: 0,
            time: 25
        },
        {
            question: "¿Quién fue el fundador de la IAM?",
            options: [
                "Mons. Carlos de Forbin-Janson",
                "Papa Francisco",
                "San Juan Bosco", 
                "Santa Teresa de Calcuta"
            ],
            correct: 0,
            time: 30
        },
        {
            question: "¿Cuál es el lema de la IAM?",
            options: [
                "Los niños evangelizan a los niños",
                "Todos somos misioneros",
                "Con Cristo hacia los demás",
                "Fe, esperanza y caridad"
            ],
            correct: 0,
            time: 35
        },
        {
            question: "¿Cuántos pilares tiene la IAM?",
            options: ["3", "4", "5", "6"],
            correct: 1,
            time: 20
        }
    ];
}

function getGameName(gameType) {
    const names = {
        quiz: 'Quiz Misionero',
        memory: 'Memoria Bíblica',
        trivia: 'Trivia IAM',
        wordsearch: 'Sopa de Letras'
    };
    return names[gameType] || gameType;
}

// ===== FUNCIONES GLOBALES PARA CONTROLES DE RADIO =====
window.togglePlay = function() {
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const nowPlaying = document.getElementById('nowPlaying');
    
    if (!window.radio.isPlaying) {
        window.radio.isPlaying = true;
        playIcon.className = 'fas fa-pause';
        playBtn.classList.add('playing');
        
        if (nowPlaying) {
            nowPlaying.innerHTML = `<i class="fas fa-headphones"></i> Escuchando: Radio Morenita 104.5 FM`;
        }
        
        showRadioNotification('¡Radio en vivo!', 'Estás escuchando Radio Morenita del Valle');
        
    } else {
        window.radio.isPlaying = false;
        playIcon.className = 'fas fa-play';
        playBtn.classList.remove('playing');
        
        if (nowPlaying) {
            nowPlaying.innerHTML = '<i class="fas fa-pause"></i> Reproducción pausada';
        }
        
        showRadioNotification('Radio pausada', 'Has pausado la transmisión');
    }
};

window.selectStream = function(streamType) {
    window.radio.currentStream = streamType;
    localStorage.setItem('radio_last_stream', streamType);
    
    const streamOptions = document.querySelectorAll('.stream-option');
    streamOptions.forEach(option => {
        if (option.dataset.stream === streamType) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    const youtubeContainer = document.getElementById('youtubePlayerContainer');
    if (youtubeContainer) {
        youtubeContainer.style.display = streamType === 'youtube' ? 'block' : 'none';
        
        // Si es YouTube, cargar el iframe
        if (streamType === 'youtube' && !youtubeContainer.querySelector('iframe').src) {
            // Aquí pondrías la URL real de YouTube Live
            youtubeContainer.querySelector('iframe').src = 'https://www.youtube.com/embed/live_stream?channel=TU_CANAL';
        }
    }
    
    if (window.radio.isPlaying) {
        showRadioNotification('Fuente cambiada', `Ahora escuchas por: ${getStreamName(streamType)}`);
    }
};

function getStreamName(streamType) {
    const names = {
        radio: 'FM 104.5 Directo',
        youtube: 'YouTube Live',
        mixlr: 'Stream Online'
    };
    return names[streamType] || streamType;
}

function initRadioSystem() {
    const volumeControl = document.getElementById('volumeControl');
    if (volumeControl) {
        volumeControl.addEventListener('input', function() {
            updateVolumeBars(this.value / 100);
        });
    }
    
    const lastStream = localStorage.getItem('radio_last_stream') || 'youtube';
    selectStream(lastStream);
}

function updateVolumeBars(volume) {
    const audioBars = document.querySelectorAll('.audio-bar');
    audioBars.forEach((bar, index) => {
        const threshold = (index + 1) / audioBars.length;
        if (volume >= threshold) {
            bar.style.height = '25px';
            bar.style.background = 'var(--secondary)';
        } else {
            bar.style.height = '10px';
            bar.style.background = 'rgba(255,255,255,0.5)';
        }
    });
}

function showRadioNotification(title, message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(`${title}: ${message}`, type);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'radio-notification';
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 
                type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    const color = type === 'error' ? '#F56565' : 
                 type === 'warning' ? '#ED8936' : 
                 type === 'success' ? '#38B2AC' : '#2A6EBB';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <i class="fas ${icon}" style="color: ${color}; font-size: 1.3rem;"></i>
            <div>
                <strong style="color: var(--text-dark);">${title}</strong>
                <p style="margin: 5px 0 0; color: var(--text-light);">${message}</p>
            </div>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; 
                color: var(--text-light); cursor: pointer; font-size: 1.2rem;">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        border-left: 4px solid ${color};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// ===== BOTÓN PARA PARTICIPANTES =====
window.showImListening = function() {
    // Mostrar opción para registrarse en juegos si hay uno activo
    if (window.radio.games.active && window.radio.games.status === 'waiting') {
        registerForGame();
    } else {
        showRadioNotification('Escuchando la radio', 'Gracias por sintonizar Radio Morenita del Valle');
    }
    return false;
};

// ===== SISTEMA DE RANKING MENSUAL (LOCAL POR AHORA) =====
window.showMonthlyRanking = function() {
    // Esta función necesita ser adaptada para Firebase
    showRadioNotification('Funcionalidad en desarrollo', 'El ranking mensual se implementará pronto', 'info');
};

// ===== FUNCIONES DE JUEGO (MANTENER PARA COMPATIBILIDAD) =====
window.beginGameWithPlayers = function() {
    showRadioNotification('Funcionalidad en desarrollo', 'Esta función se implementará con Firebase', 'info');
};

window.showCorrectAnswer = function() {
    showRadioNotification('Funcionalidad en desarrollo', 'Esta función se implementará con Firebase', 'info');
};

window.playerAnswer = function(answerIndex) {
    // Esta función será implementada con Firebase
    console.log("Respuesta seleccionada:", answerIndex);
};

function showCurrentQuestion() {
    // Esta función será implementada con Firebase
    showRadioNotification('Funcionalidad en desarrollo', 'El juego se implementará completamente con Firebase', 'info');
}

console.log("✅ Radio script cargado con Firebase integration");