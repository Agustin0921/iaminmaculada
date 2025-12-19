// radio.js - Sistema completo para Radio IAM (VERSIÓN ACTUALIZADA DICIEMBRE 2025)

class RadioIAM {
    constructor() {
        this.currentGame = null;
        this.currentPlayer = null;
        this.gameTimer = null;
        this.gameDuration = 600; // 10 minutos en segundos
        this.isAdmin = false;
        this.chatMessages = [];
        this.players = [];
        this.ranking = [];
        this.gameActive = false;
        
        this.init();
    }

    async init() {
        console.log("🎮 Inicializando Radio IAM - Diciembre 2025...");
        
        // Inicializar backend de radio
        const backendResult = await window.radioBackend.initialize();
        
        if (backendResult.success) {
            console.log("✅ Backend de radio inicializado correctamente");
            
            // Sincronizar datos locales con Firebase
            await window.radioBackend.syncLocalToFirebase();
        } else {
            console.log("⚠️ Usando modo local (Firebase no disponible)");
        }
        
        // Verificar si es admin
        this.checkAdminStatus();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Inicializar componentes
        this.initCountdown();
        this.initVisualizer();
        this.loadPlayers();
        this.loadCurrentGame();
        
        // Escuchar cambios en tiempo real
        this.startRealTimeListeners();
        
        console.log("✅ Radio IAM inicializada correctamente");
    }

    checkAdminStatus() {
        this.isAdmin = window.radioBackend.isRadioAdminLoggedIn();
        if (this.isAdmin) {
            document.getElementById('radioAdminControls').classList.remove('radio-hidden');
            document.getElementById('radioUserGamePanel').classList.add('radio-hidden');
            this.updateGameStatus('admin', 'MODO ANIMADOR');
            console.log("👑 Modo administrador activado");
        }
    }

    setupEventListeners() {
        // Botón admin radio
        document.getElementById('radioAdminBtn').addEventListener('click', () => {
            this.showRadioAdminModal();
        });

        // Formulario login admin radio
        document.getElementById('radioLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.loginRadioAdmin();
        });

        // Cerrar modal admin radio
        document.getElementById('cancelRadioLogin').addEventListener('click', () => {
            document.getElementById('radioAdminModal').style.display = 'none';
        });

        // Botones de juego admin
        document.getElementById('radioStartGameBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('radioPauseGameBtn').addEventListener('click', () => {
            this.pauseGame();
        });

        document.getElementById('radioEndGameBtn').addEventListener('click', () => {
            this.endGame();
        });

        // Registro de jugador
        document.getElementById('radioRegisterPlayerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerPlayer();
        });

        // Chat
        document.getElementById('radioChatForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendChatMessage();
        });

        // Botones de chat
        document.getElementById('radioSendPrayerBtn').addEventListener('click', () => {
            this.sendPrayerIntent();
        });

        document.getElementById('radioSendGreetingBtn').addEventListener('click', () => {
            this.sendGreeting();
        });

        document.getElementById('radioSendQuestionBtn').addEventListener('click', () => {
            this.sendQuestion();
        });

        // Player de audio
        document.getElementById('radioAudioPlayBtn').addEventListener('click', () => {
            this.toggleAudio();
        });

        document.getElementById('playRadioBtn').addEventListener('click', () => {
            this.playRadioStream();
        });

        // Volumen
        document.getElementById('radioVolumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        // Ver ranking completo
        document.getElementById('radioViewFullRanking').addEventListener('click', () => {
            this.showFullRanking();
        });

        // Mobile menu
        document.getElementById('radioMobileMenuBtn').addEventListener('click', () => {
            document.getElementById('radioMainNav').classList.toggle('active');
        });

        // Cerrar menú al hacer clic en enlace
        document.querySelectorAll('.radio-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                document.getElementById('radioMainNav').classList.remove('active');
            });
        });

        // Smooth scroll para enlaces internos
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Botones de player
        document.getElementById('radioPlayBtn')?.addEventListener('click', () => {
            this.toggleAudio();
        });

        document.getElementById('radioPrevBtn')?.addEventListener('click', () => {
            this.prevTrack();
        });

        document.getElementById('radioNextBtn')?.addEventListener('click', () => {
            this.nextTrack();
        });

        document.getElementById('radioVolumeBtn')?.addEventListener('click', () => {
            this.toggleMute();
        });

        // Botón para recargar jugadores
        document.getElementById('refreshPlayersBtn')?.addEventListener('click', () => {
            this.loadPlayers();
        });
    }

    // ===== SISTEMA DE ADMIN =====
    showRadioAdminModal() {
        document.getElementById('radioAdminModal').style.display = 'flex';
    }

    // En tu radio.js, busca la función loginRadioAdmin y CÁMBIALA por:

    async loginRadioAdmin() {
        const email = document.getElementById('radioUsername').value.trim();
        const password = document.getElementById('radioPassword').value.trim();
        
        // Validaciones básicas
        if (!email || !password) {
            this.showNotification('Por favor ingresa email y contraseña', 'error');
            return;
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Por favor ingresa un email válido', 'error');
            return;
        }
        
        // Mostrar carga
        const submitBtn = document.querySelector('#radioLoginForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        submitBtn.disabled = true;
        
        try {
            // Intentar login con Firebase Auth
            const result = await window.radioBackend.loginRadioAdmin(email, password);
            
            if (result.success) {
                this.isAdmin = true;
                
                document.getElementById('radioAdminModal').style.display = 'none';
                document.getElementById('radioAdminControls').classList.remove('radio-hidden');
                document.getElementById('radioUserGamePanel').classList.add('radio-hidden');
                
                this.updateGameStatus('admin', 'MODO ANIMADOR');
                this.showNotification(`¡Bienvenido ${result.adminData?.name || 'Animador'}!`, 'success');
                
                // Recargar datos como admin
                this.loadPlayers();
                this.loadCurrentGame();
                
            } else {
                this.showNotification(result.error || 'Error de autenticación', 'error');
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            this.showNotification('Error inesperado. Intenta nuevamente.', 'error');
            
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // ===== SISTEMA DE JUEGOS =====
    async startGame() {
        if (!this.isAdmin) {
            this.showNotification('Solo los animadores pueden iniciar juegos', 'error');
            return;
        }

        const gameType = document.getElementById('radioGameType').value;
        const duration = parseInt(document.getElementById('radioGameDuration').value) * 60;
        const pointsPerQuestion = parseInt(document.getElementById('radioPointsPerQuestion').value);
        
        this.currentGame = {
            id: 'current',
            type: gameType,
            duration: duration,
            pointsPerQuestion: pointsPerQuestion,
            startTime: new Date().toISOString(),
            status: 'active',
            questionIndex: 0,
            totalQuestions: 5,
            participants: [],
            questions: this.generateQuestions(gameType)
        };
        
        this.gameDuration = duration;
        this.gameActive = true;
        
        this.updateGameStatus('live', 'JUEGO EN VIVO');
        this.showCurrentGame();
        this.startGameTimer();
        
        // Guardar en Firebase
        const result = await window.radioBackend.saveCurrentGame(this.currentGame);
        
        if (result.success) {
            this.showNotification('¡Juego iniciado! Todos los jugadores pueden participar.', 'success');
            
            // Notificar en el chat
            this.addSystemMessage('🎮 ¡JUEGO INICIADO! Participa ahora respondiendo las preguntas.');
        } else {
            this.showNotification('Juego iniciado localmente (Firebase no disponible)', 'warning');
        }
    }

    pauseGame() {
        if (this.currentGame && this.currentGame.status === 'active') {
            this.currentGame.status = 'paused';
            clearInterval(this.gameTimer);
            this.updateGameStatus('inactive', 'JUEGO PAUSADO');
            this.showNotification('Juego pausado', 'warning');
            
            // Actualizar en Firebase si es admin
            if (this.isAdmin) {
                window.radioBackend.saveCurrentGame(this.currentGame);
            }
        }
    }

    async endGame() {
        if (this.currentGame) {
            this.currentGame.status = 'ended';
            this.gameActive = false;
            clearInterval(this.gameTimer);
            this.updateGameStatus('offline', 'JUEGO FINALIZADO');
            
            // Calcular ganadores
            this.calculateWinners();
            
            // Resetear interfaz
            document.getElementById('radioCurrentGameInfo').innerHTML = `
                <div class="radio-no-game">
                    <i class="fas fa-flag-checkered"></i>
                    <p>¡Juego finalizado!</p>
                    <p>Gracias a todos por participar.</p>
                    ${this.ranking.length > 0 ? `
                        <p style="margin-top: 10px; font-weight: bold;">
                            Ganador: ${this.ranking[0]?.name || 'Nadie'}
                        </p>
                    ` : ''}
                </div>
            `;
            
            this.showNotification('Juego finalizado. Resultados calculados.', 'success');
            
            // Anunciar ganadores en el chat
            if (this.ranking.length > 0) {
                this.addSystemMessage(`🏆 ¡GANADORES! 1° ${this.ranking[0]?.name || 'Nadie'}, 2° ${this.ranking[1]?.name || 'Nadie'}, 3° ${this.ranking[2]?.name || 'Nadie'}`);
            }
            
            // Actualizar en Firebase
            if (this.isAdmin) {
                await window.radioBackend.saveCurrentGame(this.currentGame);
            }
            
            // Recargar ranking
            this.loadPlayers();
        }
    }

    generateQuestions(gameType) {
        const questions = {
            preguntas: [
                {
                    id: 1,
                    question: "¿Qué significa IAM?",
                    answers: [
                        "Infancia y Adolescencia Misionera",
                        "Iglesia y Amor Misionero",
                        "Infancia Animada Misionera",
                        "Iglesia Amorosa Misionera"
                    ],
                    correct: 0,
                    points: 10
                },
                {
                    id: 2,
                    question: "¿Quién fundó la IAM?",
                    answers: [
                        "Mons. Carlos de Forbin-Janson",
                        "San Francisco de Asís",
                        "Santa Teresita del Niño Jesús",
                        "San Pablo"
                    ],
                    correct: 0,
                    points: 15
                },
                {
                    id: 3,
                    question: "¿En qué año se fundó la IAM?",
                    answers: ["1843", "1900", "1950", "2000"],
                    correct: 0,
                    points: 20
                },
                {
                    id: 4,
                    question: "¿Cuál es el lema de la IAM?",
                    answers: [
                        "Los niños evangelizan a los niños",
                        "Todos somos misioneros",
                        "Llevad el Evangelio a todo el mundo",
                        "La fe sin obras está muerta"
                    ],
                    correct: 0,
                    points: 10
                },
                {
                    id: 5,
                    question: "¿Cuántos países tiene presencia la IAM?",
                    answers: ["130", "50", "200", "80"],
                    correct: 0,
                    points: 25
                }
            ],
            adivinanza: [
                {
                    id: 1,
                    question: "Soy una obra pontificia donde los niños ayudan a otros niños. ¿Quién soy?",
                    answers: ["La IAM", "Cáritas", "Manos Unidas", "Misiones Diocesanas"],
                    correct: 0,
                    points: 20
                }
            ],
            trivia: [
                {
                    id: 1,
                    question: "¿Qué Papa declaró a la IAM como Obra Pontificia?",
                    answers: ["Pío XI", "Juan Pablo II", "Francisco", "Benedicto XVI"],
                    correct: 0,
                    points: 25
                }
            ]
        };
        
        return questions[gameType] || questions.preguntas;
    }

    startGameTimer() {
        let timeLeft = this.gameDuration;
        
        this.gameTimer = setInterval(() => {
            timeLeft--;
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            const timerElement = document.querySelector('.radio-game-timer');
            if (timerElement) {
                timerElement.innerHTML = `
                    <i class="fas fa-clock"></i>
                    <span>Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>
                `;
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.gameTimer);
                this.endGame();
            }
        }, 1000);
    }

    updateGameStatus(status, text) {
        const dot = document.getElementById('radioGameStatusDot');
        const statusText = document.getElementById('radioGameStatusText');
        
        if (dot) dot.className = 'status-dot ' + status;
        if (statusText) statusText.textContent = text;
    }

    showCurrentGame() {
        if (!this.currentGame || !this.currentGame.questions) return;
        
        const question = this.currentGame.questions[this.currentGame.questionIndex] || this.currentGame.questions[0];
        const html = `
            <div class="active-game-info">
                <div class="radio-game-timer">
                    <i class="fas fa-clock"></i>
                    <span>Tiempo: 10:00</span>
                </div>
                <div class="radio-game-question">
                    ${question.question}
                </div>
                <div class="radio-game-answers">
                    ${question.answers.map((answer, index) => `
                        <button class="radio-game-answer-btn" data-index="${index}" data-question="${question.id}">
                            ${answer}
                        </button>
                    `).join('')}
                </div>
                <p style="text-align: center; margin-top: 15px; color: var(--text-light); font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Selecciona tu respuesta para ganar ${question.points} puntos
                </p>
            </div>
        `;
        
        document.getElementById('radioCurrentGameInfo').innerHTML = html;
        
        // Agregar eventos a los botones de respuesta
        document.querySelectorAll('.radio-game-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = parseInt(e.target.dataset.question);
                const answerIndex = parseInt(e.target.dataset.index);
                this.submitAnswer(questionId, answerIndex);
            });
        });
    }

    // ===== SISTEMA DE JUGADORES =====
    async registerPlayer() {
        const name = document.getElementById('radioPlayerName').value.trim();
        const phone = document.getElementById('radioPlayerPhone').value.trim();
        const email = document.getElementById('radioPlayerEmail').value.trim();
        
        if (!name) {
            this.showNotification('Por favor ingresa tu nombre', 'error');
            return;
        }
        
        const result = await window.radioBackend.saveRadioPlayer({
            name: name,
            phone: phone,
            email: email
        });
        
        if (result.success) {
            this.currentPlayer = result.player;
            this.showNotification(`¡Bienvenido ${name}! Listo para jugar.`, 'success');
            
            // Anunciar en el chat
            this.addSystemMessage(`👋 ¡Bienvenido ${name} al juego!`);
            
            // Resetear formulario
            document.getElementById('radioRegisterPlayerForm').reset();
            
            // Recargar lista de jugadores
            this.loadPlayers();
        } else {
            this.showNotification('Error al registrarse. Intenta nuevamente.', 'error');
        }
    }

    async submitAnswer(questionId, answerIndex) {
        if (!this.currentPlayer) {
            this.showNotification('Regístrate primero para jugar', 'error');
            return;
        }
        
        if (!this.currentGame || !this.gameActive) {
            this.showNotification('No hay ningún juego activo en este momento', 'error');
            return;
        }
        
        const question = this.currentGame.questions.find(q => q.id === questionId);
        if (!question) {
            this.showNotification('Pregunta no encontrada', 'error');
            return;
        }
        
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            // Sumar puntos al jugador
            const pointsToAdd = question.points;
            
            // Actualizar en localStorage
            const localPlayers = JSON.parse(localStorage.getItem('radioPlayers') || '[]');
            const playerIndex = localPlayers.findIndex(p => p.id === this.currentPlayer.id);
            
            if (playerIndex !== -1) {
                localPlayers[playerIndex].points += pointsToAdd;
                localPlayers[playerIndex].gamesPlayed += 1;
                localStorage.setItem('radioPlayers', JSON.stringify(localPlayers));
                
                // Actualizar jugador actual
                this.currentPlayer.points = localPlayers[playerIndex].points;
                this.currentPlayer.gamesPlayed = localPlayers[playerIndex].gamesPlayed;
            }
            
            this.showNotification(`¡Respuesta correcta! +${pointsToAdd} puntos`, 'success');
            
            // Anunciar en el chat
            this.addSystemMessage(`🎯 ${this.currentPlayer.name} respondió correctamente y ganó ${pointsToAdd} puntos!`);
            
            // Actualizar ranking
            this.loadPlayers();
            
        } else {
            this.showNotification('Respuesta incorrecta. Sigue intentando.', 'error');
        }
    }

    // ===== SISTEMA DE RANKING =====
    async loadPlayers() {
        const result = await window.radioBackend.getRadioPlayers();
        
        if (result.success) {
            this.players = result.data;
            this.updatePlayerList();
            this.updateRankingDisplay();
            this.updateStats();
        }
    }

    updateRankingDisplay() {
        const rankingList = document.getElementById('radioRankingList');
        
        if (!rankingList) return;
        
        if (this.players.length === 0) {
            rankingList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-light);">
                    <i class="fas fa-trophy" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p>No hay jugadores aún</p>
                    <p>¡Sé el primero en participar!</p>
                </div>
            `;
            return;
        }
        
        // Ordenar por puntos
        const sortedPlayers = [...this.players].sort((a, b) => (b.points || 0) - (a.points || 0));
        
        rankingList.innerHTML = sortedPlayers.slice(0, 5).map((player, index) => {
            const topClass = index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : '';
            const avatarText = player.name.charAt(0).toUpperCase();
            
            return `
                <div class="radio-ranking-item ${topClass}">
                    <div class="radio-rank-position">${index + 1}</div>
                    <div class="radio-player-avatar">
                        ${index === 0 ? '<i class="fas fa-crown"></i>' : avatarText}
                    </div>
                    <div class="radio-ranking-player-info">
                        <h5>${player.name}</h5>
                        <p>${player.gamesPlayed || 0} juegos</p>
                    </div>
                    <div class="radio-player-points">
                        <i class="fas fa-star"></i>
                        <span>${player.points || 0}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updatePlayerList() {
        const participantsList = document.getElementById('radioParticipantsList');
        const count = this.players.length;
        
        if (participantsList) {
            document.getElementById('radioParticipantsCount').textContent = count;
            
            participantsList.innerHTML = this.players.slice(0, 8).map(player => {
                const avatarText = player.name.charAt(0).toUpperCase();
                
                return `
                    <div class="radio-participant-item">
                        <div class="radio-participant-avatar">${avatarText}</div>
                        <div class="radio-participant-info">
                            <h5>${player.name}</h5>
                            <p>${player.gamesPlayed || 0} juegos</p>
                        </div>
                        <div class="radio-participant-points">
                            <i class="fas fa-star"></i>
                            <span>${player.points || 0}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            if (this.players.length > 8) {
                participantsList.innerHTML += `
                    <div style="text-align: center; padding: 10px; color: var(--text-light); font-size: 0.9rem;">
                        <i class="fas fa-ellipsis-h"></i>
                        y ${this.players.length - 8} más
                    </div>
                `;
            }
        }
    }

    updateStats() {
        const totalPoints = this.players.reduce((sum, player) => sum + (player.points || 0), 0);
        const gamesPlayed = this.players.reduce((sum, player) => sum + (player.gamesPlayed || 0), 0);
        
        if (document.getElementById('radioGamesPlayed')) {
            document.getElementById('radioGamesPlayed').textContent = gamesPlayed;
        }
        if (document.getElementById('radioTotalPoints')) {
            document.getElementById('radioTotalPoints').textContent = totalPoints;
        }
        if (document.getElementById('radioTotalPlayers')) {
            document.getElementById('radioTotalPlayers').textContent = this.players.length;
        }
    }

    calculateWinners() {
        // Ordenar jugadores por puntos
        const sortedPlayers = [...this.players].sort((a, b) => (b.points || 0) - (a.points || 0));
        
        // Guardar ganadores en localStorage
        localStorage.setItem('lastWinners', JSON.stringify(sortedPlayers.slice(0, 3)));
        
        return sortedPlayers;
    }

    // ===== SISTEMA DE CHAT =====
    async sendChatMessage() {
        const messageInput = document.getElementById('radioChatMessage');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        const playerName = this.currentPlayer ? this.currentPlayer.name : 'Oyente';
        
        const chatMessage = {
            id: Date.now(),
            playerName: playerName,
            message: message,
            timestamp: new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            type: 'message'
        };
        
        this.chatMessages.push(chatMessage);
        this.updateChatDisplay();
        
        // Guardar en localStorage
        this.saveChatToLocalStorage();
        
        // Limpiar input
        messageInput.value = '';
        messageInput.focus();
    }

    sendPrayerIntent() {
        const messageInput = document.getElementById('radioChatMessage');
        messageInput.value = '🙏 Envío mi intención de oración para el programa';
        messageInput.focus();
    }

    sendGreeting() {
        const playerName = this.currentPlayer ? this.currentPlayer.name : 'Oyente';
        const messageInput = document.getElementById('radioChatMessage');
        messageInput.value = `¡Hola a todos! Soy ${playerName}, un saludo desde mi casa. ¡Viva la IAM!`;
        messageInput.focus();
    }

    sendQuestion() {
        const messageInput = document.getElementById('radioChatMessage');
        messageInput.value = '❓ Tengo una pregunta sobre...';
        messageInput.focus();
    }

    updateChatDisplay() {
        const chatMessagesDiv = document.getElementById('radioChatMessages');
        if (!chatMessagesDiv) return;
        
        // Mantener solo los últimos 20 mensajes
        const recentMessages = this.chatMessages.slice(-20);
        
        chatMessagesDiv.innerHTML = `
            <div class="radio-system-message">
                <i class="fas fa-info-circle"></i>
                <p>¡Bienvenido al chat de Radio IAM! Aquí puedes compartir tus intenciones de oración y participar durante el programa.</p>
            </div>
        ` + recentMessages.map(msg => {
            if (msg.type === 'system') {
                return `
                    <div class="radio-system-message">
                        <i class="fas fa-broadcast-tower"></i>
                        <p>${msg.message}</p>
                    </div>
                `;
            }
            
            return `
                <div class="radio-chat-message">
                    <div class="radio-chat-header-info">
                        <span class="radio-chat-user">${msg.playerName}</span>
                        <span class="radio-chat-time">${msg.timestamp}</span>
                    </div>
                    <div class="radio-chat-text">${msg.message}</div>
                </div>
            `;
        }).join('');
        
        // Auto-scroll al final
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    addSystemMessage(message) {
        const systemMessage = {
            id: Date.now(),
            playerName: 'Sistema',
            message: message,
            timestamp: new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            type: 'system'
        };
        
        this.chatMessages.push(systemMessage);
        this.updateChatDisplay();
        this.saveChatToLocalStorage();
    }

    saveChatToLocalStorage() {
        // Guardar solo los últimos 50 mensajes
        const recentMessages = this.chatMessages.slice(-50);
        localStorage.setItem('radioChat', JSON.stringify(recentMessages));
    }

    loadChatFromLocalStorage() {
        const savedChat = localStorage.getItem('radioChat');
        if (savedChat) {
            this.chatMessages = JSON.parse(savedChat);
            this.updateChatDisplay();
        }
    }

    // ===== AUDIO Y RADIO =====
    initVisualizer() {
        const visualizer = document.getElementById('radioVisualizerBars');
        if (visualizer) {
            visualizer.innerHTML = Array(8).fill(0).map(() => 
                `<div class="bar" style="height: ${Math.random() * 30 + 20}px;"></div>`
            ).join('');
        }
    }

    toggleAudio() {
        const playBtn = document.getElementById('radioAudioPlayBtn');
        if (!playBtn) return;
        
        const icon = playBtn.querySelector('i');
        
        if (icon.classList.contains('fa-play')) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
            this.showNotification('Reproduciendo radio', 'success');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            this.showNotification('Radio pausada', 'warning');
        }
    }

    playRadioStream() {
        this.showNotification('Conectando con la radio...', 'info');
        
        // Simulación de conexión
        setTimeout(() => {
            this.showNotification('¡Radio en vivo! Sintonizando "Con Corazón Misionero"', 'success');
            if (document.getElementById('radioStatusText')) {
                document.getElementById('radioStatusText').textContent = 'ESCUCHANDO';
            }
            if (document.getElementById('radioStatusDot')) {
                document.getElementById('radioStatusDot').className = 'status-dot live';
            }
        }, 1000);
    }

    setVolume(volume) {
        console.log('Volumen ajustado a:', volume + '%');
    }

    prevTrack() {
        this.showNotification('Pista anterior', 'info');
    }

    nextTrack() {
        this.showNotification('Siguiente pista', 'info');
    }

    toggleMute() {
        const volumeBtn = document.getElementById('radioVolumeBtn');
        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i');
            if (icon.classList.contains('fa-volume-up')) {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute');
                this.showNotification('Silencio activado', 'warning');
            } else {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
                this.showNotification('Sonido activado', 'success');
            }
        }
    }

    // ===== COUNTDOWN =====
    initCountdown() {
        // Calcular tiempo hasta el próximo sábado 10:30
        const now = new Date();
        const nextSaturday = new Date();
        
        // Días hasta el próximo sábado (0 = Domingo, 6 = Sábado)
        const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
        nextSaturday.setDate(now.getDate() + daysUntilSaturday);
        nextSaturday.setHours(10, 30, 0, 0);
        
        this.updateCountdown(now, nextSaturday);
        
        // Actualizar cada segundo
        this.countdownInterval = setInterval(() => {
            this.updateCountdown(new Date(), nextSaturday);
        }, 1000);
    }

    updateCountdown(now, target) {
        const diff = target - now;
        const countdownDisplay = document.getElementById('radioCountdownDisplay');
        
        if (!countdownDisplay) return;
        
        if (diff <= 0) {
            // Estamos en vivo
            if (document.getElementById('radioStatusDot')) {
                document.getElementById('radioStatusDot').className = 'status-dot live';
            }
            if (document.getElementById('radioStatusText')) {
                document.getElementById('radioStatusText').textContent = 'EN VIVO AHORA';
            }
            
            countdownDisplay.innerHTML = `
                <div class="radio-countdown-unit">
                    <div class="radio-unit-value">00</div>
                    <div class="radio-unit-label">HORAS</div>
                </div>
                <div class="radio-countdown-separator">:</div>
                <div class="radio-countdown-unit">
                    <div class="radio-unit-value">00</div>
                    <div class="radio-unit-label">MIN</div>
                </div>
                <div class="radio-countdown-separator">:</div>
                <div class="radio-countdown-unit">
                    <div class="radio-unit-value">00</div>
                    <div class="radio-unit-label">SEG</div>
                </div>
            `;
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        countdownDisplay.innerHTML = `
            <div class="radio-countdown-unit">
                <div class="radio-unit-value">${hours.toString().padStart(2, '0')}</div>
                <div class="radio-unit-label">HORAS</div>
            </div>
            <div class="radio-countdown-separator">:</div>
            <div class="radio-countdown-unit">
                <div class="radio-unit-value">${minutes.toString().padStart(2, '0')}</div>
                <div class="radio-unit-label">MIN</div>
            </div>
            <div class="radio-countdown-separator">:</div>
            <div class="radio-countdown-unit">
                <div class="radio-unit-value">${seconds.toString().padStart(2, '0')}</div>
                <div class="radio-unit-label">SEG</div>
            </div>
        `;
    }

    // ===== TIEMPO REAL =====
    startRealTimeListeners() {
        // Escuchar cambios en el juego cada 5 segundos
        this.gameListener = setInterval(async () => {
            await this.checkForGameUpdates();
        }, 5000);
        
        // Escuchar cambios en jugadores cada 10 segundos
        this.playersListener = setInterval(async () => {
            await this.checkForPlayersUpdates();
        }, 10000);
        
        // Cargar chat guardado
        this.loadChatFromLocalStorage();
    }

    async checkForGameUpdates() {
        if (this.isAdmin) return; // Los admin no necesitan escuchar, ellos controlan
        
        const result = await window.radioBackend.getCurrentGame();
        
        if (result.success && result.data) {
            const remoteGame = result.data;
            
            // Si hay un juego remoto activo y nosotros no tenemos juego activo
            if (remoteGame.status === 'active' && !this.gameActive) {
                this.currentGame = remoteGame;
                this.gameActive = true;
                this.updateGameStatus('live', 'JUEGO EN VIVO');
                this.showCurrentGame();
                
                if (!this.gameTimer && remoteGame.startTime) {
                    this.startGameTimerFromRemote(remoteGame.startTime);
                }
                
                this.showNotification('¡Nuevo juego iniciado! Participa ahora.', 'info');
            }
            // Si el juego remoto terminó
            else if (remoteGame.status === 'ended' && this.gameActive) {
                this.endGame();
            }
        }
    }

    startGameTimerFromRemote(startTime) {
        const start = new Date(startTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        let timeLeft = this.currentGame.duration - elapsedSeconds;
        
        if (timeLeft <= 0) {
            this.endGame();
            return;
        }
        
        this.gameTimer = setInterval(() => {
            timeLeft--;
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            const timerElement = document.querySelector('.radio-game-timer');
            if (timerElement) {
                timerElement.innerHTML = `
                    <i class="fas fa-clock"></i>
                    <span>Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>
                `;
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.gameTimer);
                this.endGame();
            }
        }, 1000);
    }

    async checkForPlayersUpdates() {
        await this.loadPlayers();
    }

    async loadCurrentGame() {
        const result = await window.radioBackend.getCurrentGame();
        
        if (result.success && result.data) {
            this.currentGame = result.data;
            
            if (this.currentGame.status === 'active') {
                this.gameActive = true;
                this.updateGameStatus('live', 'JUEGO EN VIVO');
                this.showCurrentGame();
                
                if (this.currentGame.startTime) {
                    this.startGameTimerFromRemote(this.currentGame.startTime);
                }
            }
        }
    }

    // ===== UTILIDADES =====
    showFullRanking() {
        // Crear modal de ranking completo
        const modalHTML = `
            <div class="radio-modal" id="fullRankingModal" style="display: flex;">
                <div class="radio-modal-content" style="max-width: 500px;">
                    <button class="radio-modal-close" onclick="document.getElementById('fullRankingModal').style.display='none'">&times;</button>
                    <div class="radio-modal-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h3>Ranking Completo - Diciembre 2025</h3>
                    
                    <div style="max-height: 400px; overflow-y: auto; margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 10px;">
                        ${this.players.length === 0 ? `
                            <div style="text-align: center; padding: 40px; color: #666;">
                                <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3;"></i>
                                <p style="margin-top: 15px;">No hay jugadores aún</p>
                            </div>
                        ` : this.players.map((player, index) => `
                            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #eee; background: white; margin-bottom: 8px; border-radius: 8px;">
                                <div style="font-weight: bold; width: 40px; text-align: center; 
                                         color: ${index === 0 ? '#FFC107' : index === 1 ? '#9E9E9E' : index === 2 ? '#FFB347' : '#666'};
                                         font-size: ${index < 3 ? '1.2rem' : '1rem'}">
                                    ${index + 1}
                                </div>
                                <div style="flex: 1; margin-left: 15px;">
                                    <div style="font-weight: bold; color: #2A6EBB;">${player.name}</div>
                                    <div style="font-size: 0.85rem; color: #666;">
                                        ${player.gamesPlayed || 0} juegos • ${player.phone || 'Sin teléfono'}
                                    </div>
                                </div>
                                <div style="font-weight: bold; color: #2A6EBB; font-size: 1.1rem;">
                                    ${player.points || 0} <i class="fas fa-star" style="color: #FFC107; margin-left: 5px;"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center; font-size: 0.9rem; color: #666;">
                        <i class="fas fa-info-circle"></i> Los premios se entregan al final del mes
                    </div>
                </div>
            </div>
        `;
        
        // Crear modal temporal
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv);
        
        // Cerrar modal al hacer clic fuera
        document.getElementById('fullRankingModal').addEventListener('click', (e) => {
            if (e.target.id === 'fullRankingModal') {
                e.target.style.display = 'none';
            }
        });
    }

    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `radio-notification`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Estilos para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#38B2AC' : type === 'error' ? '#F56565' : '#2A6EBB'};
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            animation: radioSlideIn 0.3s ease;
            max-width: 350px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        // Agregar keyframes para animación si no existen
        if (!document.getElementById('radio-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'radio-notification-styles';
            style.textContent = `
                @keyframes radioSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes radioSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remover después de 4 segundos
        setTimeout(() => {
            notification.style.animation = 'radioSlideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // ===== CLEANUP =====
    cleanup() {
        if (this.gameTimer) clearInterval(this.gameTimer);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (this.gameListener) clearInterval(this.gameListener);
        if (this.playersListener) clearInterval(this.playersListener);
    }
}

// Inicializar Radio IAM cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la página de radio
    if (document.querySelector('.radio-header')) {
        window.radioIAM = new RadioIAM();
        
        // Limpiar al salir de la página
        window.addEventListener('beforeunload', () => {
            if (window.radioIAM) {
                window.radioIAM.cleanup();
            }
        });
    }
});

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RadioIAM;
}