// radio.js - Sistema completo para Radio IAM (VERSIÓN ACTUALIZADA DICIEMBRE 2025)

class RadioIAM {
    constructor() {
        this.currentGame = null;
        this.currentPlayer = null;
        this.gameTimer = null;
        this.questionTimer = null;
        this.gameDuration = 600; // 10 minutos en segundos
        this.isAdmin = false;
        this.chatMessages = [];
        this.players = [];
        this.ranking = [];
        this.gameActive = false;
        this.currentQuestionIndex = 0;
        
        this.init();
    }

    async init() {
        console.log("🎮 Inicializando Radio IAM - Diciembre 2025...");
        
        // Inicializar backend de radio
        const backendResult = await window.radioBackend.initialize();
        
        if (backendResult.success) {
            console.log("✅ Backend de radio inicializado correctamente");
            
            // Inicializar chat en vivo
            if (window.radioChat) {
                await window.radioChat.initialize();
            }
            
            // Sincronizar datos locales con Firebase
            await window.radioBackend.syncLocalToFirebase();
        } else {
            console.log("⚠️ Usando modo local (Firebase no disponible)");
        }
        
        // Verificar si es admin
        this.checkAdminStatus();
        
        // Cargar jugador desde localStorage
        this.loadCurrentPlayer();
        
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
        // VERIFICAR CON localStorage EN LUGAR DE FIREBASE PARA PRUEBAS
        const isAdmin = localStorage.getItem('radioAdminLoggedIn') === 'true';
        
        this.isAdmin = isAdmin;
        
        const adminControls = document.getElementById('radioAdminControls');
        const userGamePanel = document.getElementById('radioUserGamePanel');
        
        if (this.isAdmin) {
            // MOSTRAR controles de admin y OCULTAR panel de usuario
            if (adminControls) {
                adminControls.classList.remove('radio-hidden');
            }
            if (userGamePanel) {
                userGamePanel.classList.add('radio-hidden');
            }
            
            this.updateGameStatus('admin', 'MODO ANIMADOR');
            console.log("👑 Modo administrador activado");
        } else {
            // OCULTAR controles de admin y MOSTRAR panel de usuario
            if (adminControls) {
                adminControls.classList.add('radio-hidden');
            }
            if (userGamePanel) {
                userGamePanel.classList.remove('radio-hidden');
            }
            
            console.log("👤 Modo usuario normal");
        }
    }

    loadCurrentPlayer() {
        const savedPlayer = localStorage.getItem('radioPlayer');
        if (savedPlayer) {
            this.currentPlayer = JSON.parse(savedPlayer);
            console.log(`👤 Jugador cargado: ${this.currentPlayer.name}`);
            
            // Configurar nombre en el chat si existe
            if (window.radioChat) {
                window.radioChat.setUserName(this.currentPlayer.name);
            }
        }
    }

    setupEventListeners() {
        // Botón admin radio - ASEGURAR QUE ESTÁ DISPONIBLE
        const adminBtn = document.getElementById('radioAdminBtn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                this.showRadioAdminModal();
            });
        }

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
        const startGameBtn = document.getElementById('radioStartGameBtn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }

        const pauseGameBtn = document.getElementById('radioPauseGameBtn');
        if (pauseGameBtn) {
            pauseGameBtn.addEventListener('click', () => {
                this.pauseGame();
            });
        }

        const endGameBtn = document.getElementById('radioEndGameBtn');
        if (endGameBtn) {
            endGameBtn.addEventListener('click', () => {
                this.endGame();
            });
        }

        // Registro de jugador
        const registerForm = document.getElementById('radioRegisterPlayerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registerPlayer();
            });
        }

        // Chat - Enviar mensaje
        const chatForm = document.getElementById('radioChatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendChatMessage();
            });
        }

        // Botones de chat
        const prayerBtn = document.getElementById('radioSendPrayerBtn');
        if (prayerBtn) {
            prayerBtn.addEventListener('click', () => {
                this.sendPrayerIntent();
            });
        }

        const greetingBtn = document.getElementById('radioSendGreetingBtn');
        if (greetingBtn) {
            greetingBtn.addEventListener('click', () => {
                this.sendGreeting();
            });
        }

        const questionBtn = document.getElementById('radioSendQuestionBtn');
        if (questionBtn) {
            questionBtn.addEventListener('click', () => {
                this.sendQuestion();
            });
        }

        // Player de audio
        const audioPlayBtn = document.getElementById('radioAudioPlayBtn');
        if (audioPlayBtn) {
            audioPlayBtn.addEventListener('click', () => {
                this.toggleAudio();
            });
        }

        const playRadioBtn = document.getElementById('playRadioBtn');
        if (playRadioBtn) {
            playRadioBtn.addEventListener('click', () => {
                this.playRadioStream();
            });
        }

        // Volumen
        const volumeSlider = document.getElementById('radioVolumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value);
            });
        }

        // Ver ranking completo
        const viewRankingBtn = document.getElementById('radioViewFullRanking');
        if (viewRankingBtn) {
            viewRankingBtn.addEventListener('click', () => {
                this.showFullRanking();
            });
        }

        // Mobile menu
        const mobileMenuBtn = document.getElementById('radioMobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const mainNav = document.getElementById('radioMainNav');
                if (mainNav) {
                    mainNav.classList.toggle('active');
                }
            });
        }

        // Cerrar menú al hacer clic en enlace
        document.querySelectorAll('.radio-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const mainNav = document.getElementById('radioMainNav');
                if (mainNav) {
                    mainNav.classList.remove('active');
                }
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
        const radioPlayBtn = document.getElementById('radioPlayBtn');
        if (radioPlayBtn) {
            radioPlayBtn.addEventListener('click', () => {
                this.toggleAudio();
            });
        }

        const prevBtn = document.getElementById('radioPrevBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.prevTrack();
            });
        }

        const nextBtn = document.getElementById('radioNextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextTrack();
            });
        }

        const volumeBtn = document.getElementById('radioVolumeBtn');
        if (volumeBtn) {
            volumeBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        // Botón para recargar jugadores
        const refreshBtn = document.getElementById('refreshPlayersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadPlayers();
            });
        }

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('radioAdminModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        if (this.isAdmin) {
            this.setupQuestionPreview();
            
            // Inicializar preview si hay elementos
            setTimeout(() => {
                if (document.getElementById('radioQuestionsPreview')) {
                    this.previewQuestions();
                }
            }, 500);
        }
    }

    // ===== SISTEMA DE ADMIN =====
    showRadioAdminModal() {
        const modal = document.getElementById('radioAdminModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

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
                
                // Actualizar visibilidad
                this.checkAdminStatus();
                
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

        // Obtener configuración del admin
        const gameType = document.getElementById('radioGameType').value;
        const totalQuestions = parseInt(document.getElementById('radioTotalQuestions')?.value || 10);
        const gameDuration = parseInt(document.getElementById('radioGameDuration')?.value || 15) * 60;
        const timePerQuestion = parseInt(document.getElementById('radioTimePerQuestion')?.value || 30);
        const basePoints = parseInt(document.getElementById('radioPointsPerQuestion')?.value || 10);
        const difficulty = document.getElementById('radioGameDifficulty')?.value || 'all';

        // Generar preguntas con la nueva configuración
        const questions = this.generateQuestions(gameType, totalQuestions);

        // Filtrar por dificultad si es necesario
        let filteredQuestions = questions;
        if (difficulty !== 'all') {
            filteredQuestions = questions.filter(q => {
                if (difficulty === 'easy') return q.difficulty === 'Fácil';
                if (difficulty === 'medium') return q.difficulty === 'Fácil' || q.difficulty === 'Intermedio';
                if (difficulty === 'hard') return true;
                return true;
            });
        }

        // Aplicar tiempo configurado a todas las preguntas
        const questionsWithTime = filteredQuestions.map(q => ({
            ...q,
            timeLimit: timePerQuestion
        }));

        this.currentGame = {
            id: 'current',
            type: gameType,
            duration: gameDuration,
            timePerQuestion: timePerQuestion,
            totalQuestions: totalQuestions,
            questions: questionsWithTime,
            startTime: new Date().toISOString(),
            status: 'active',
            currentQuestionIndex: 0,
            participants: [],
            settings: {
                difficulty: difficulty,
                totalQuestions: totalQuestions,
                timePerQuestion: timePerQuestion,
                basePoints: basePoints
            }
        };

        this.gameDuration = gameDuration;
        this.gameActive = true;
        this.currentQuestionIndex = 0;

        this.updateGameStatus('live', 'JUEGO EN VIVO');
        this.showCurrentGame();
        this.startGameTimer();

        // Iniciar actualización de estadísticas para admin
        if (this.isAdmin) {
            this.startAdminStats();
        }

        // Guardar en Firebase
        const result = await window.radioBackend.saveCurrentGame(this.currentGame);

        if (result.success) {
            this.showNotification(`¡Juego iniciado! ${totalQuestions} preguntas • ${timePerQuestion}s cada una`, 'success');

            // Notificar en el chat
            if (window.radioChat) {
                window.radioChat.sendMessage(
                    `🎮 ¡JUEGO INICIADO! ${totalQuestions} preguntas • ${timePerQuestion} segundos cada una • ¡Participa ahora!`,
                    'system'
                );
            }
        } else {
            this.showNotification('Juego iniciado localmente (Firebase no disponible)', 'warning');
        }
    }

    pauseGame() {
        if (this.currentGame && this.currentGame.status === 'active') {
            this.currentGame.status = 'paused';
            clearInterval(this.gameTimer);
            if (this.questionTimer) clearInterval(this.questionTimer);
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
            if (this.questionTimer) clearInterval(this.questionTimer);
            this.updateGameStatus('offline', 'JUEGO FINALIZADO');
            
            // Calcular ganadores
            const winners = this.calculateWinners();
            
            // Resetear interfaz
            const currentGameInfo = document.getElementById('radioCurrentGameInfo');
            if (currentGameInfo) {
                currentGameInfo.innerHTML = `
                    <div class="radio-no-game">
                        <i class="fas fa-flag-checkered"></i>
                        <p>¡Juego finalizado!</p>
                        <p>Gracias a todos por participar.</p>
                        ${winners.length > 0 ? `
                            <p style="margin-top: 10px; font-weight: bold; color: var(--primary);">
                                🏆 Ganador: ${winners[0]?.name || 'Nadie'}
                            </p>
                            ${winners[1] ? `<p>🥈 Segundo: ${winners[1]?.name}</p>` : ''}
                            ${winners[2] ? `<p>🥉 Tercero: ${winners[2]?.name}</p>` : ''}
                        ` : ''}
                    </div>
                `;
            }
            
            this.showNotification('Juego finalizado. Resultados calculados.', 'success');
            
            // Anunciar ganadores en el chat
            if (window.radioChat && winners.length > 0) {
                let winnerMessage = '🏆 ¡GANADORES DEL JUEGO! ';
                if (winners[0]) winnerMessage += `1° ${winners[0].name} `;
                if (winners[1]) winnerMessage += `2° ${winners[1].name} `;
                if (winners[2]) winnerMessage += `3° ${winners[2].name}`;
                
                window.radioChat.sendMessage(winnerMessage, 'system');
            }
            
            // Actualizar en Firebase
            if (this.isAdmin) {
                await window.radioBackend.saveCurrentGame(this.currentGame);
            }
            
            // Recargar ranking
            this.loadPlayers();
            
            // Limpiar respuestas guardadas
            this.clearAnsweredQuestions();
        }
    }

    generateQuestions(gameType, totalQuestions = 10, customPoints = null) {
        // Banco de preguntas ampliado
        const questionBank = {
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
                    points: 10,
                    category: "Básico",
                    difficulty: "Fácil",
                    timeLimit: 30
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
                    points: 15,
                    category: "Historia",
                    difficulty: "Fácil",
                    timeLimit: 30
                },
                {
                    id: 3,
                    question: "¿En qué año se fundó la IAM?",
                    answers: ["1843", "1900", "1950", "2000"],
                    correct: 0,
                    points: 15,
                    category: "Historia", 
                    difficulty: "Fácil",
                    timeLimit: 25
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
                    points: 10,
                    category: "Básico",
                    difficulty: "Fácil",
                    timeLimit: 30
                },
                {
                    id: 5,
                    question: "¿Cuántos países tiene presencia la IAM?",
                    answers: ["130", "50", "200", "80"],
                    correct: 0,
                    points: 20,
                    category: "Datos",
                    difficulty: "Intermedio",
                    timeLimit: 25
                },
                {
                    id: 6,
                    question: "¿Qué Papa declaró a la IAM como Obra Pontificia?",
                    answers: ["Pío XI", "Juan Pablo II", "Francisco", "Benedicto XVI"],
                    correct: 0,
                    points: 20,
                    category: "Historia",
                    difficulty: "Intermedio",
                    timeLimit: 30
                },
                {
                    id: 7,
                    question: "¿Cuál es el color que identifica a la IAM?",
                    answers: ["Verde", "Rojo", "Azul", "Amarillo"],
                    correct: 0,
                    points: 10,
                    category: "Básico",
                    difficulty: "Fácil", 
                    timeLimit: 20
                },
                {
                    id: 8,
                    question: "¿Qué representa la huchita misionera?",
                    answers: [
                        "La cooperación económica para las misiones",
                        "Un recipiente para guardar dulces",
                        "Un símbolo de riqueza personal",
                        "Una tradición antigua sin significado"
                    ],
                    correct: 0,
                    points: 15,
                    category: "Espiritualidad",
                    difficulty: "Fácil",
                    timeLimit: 30
                },
                {
                    id: 9,
                    question: "¿Cuántos pilares tiene la espiritualidad de la IAM?",
                    answers: ["4", "3", "5", "7"],
                    correct: 0,
                    points: 15,
                    category: "Espiritualidad",
                    difficulty: "Fácil",
                    timeLimit: 25
                },
                {
                    id: 10,
                    question: "¿Qué día se celebra el DOMUND?",
                    answers: [
                        "El penúltimo domingo de octubre",
                        "El primer domingo de noviembre", 
                        "Navidad",
                        "Pascua de Resurrección"
                    ],
                    correct: 0,
                    points: 20,
                    category: "Fechas",
                    difficulty: "Intermedio",
                    timeLimit: 30
                },
                {
                    id: 11,
                    question: "¿Cuál es el propósito principal de la IAM?",
                    answers: [
                        "Formar niños con corazón misionero",
                        "Recaudar fondos para la Iglesia",
                        "Organizar campamentos de verano",
                        "Enseñar catequesis básica"
                    ],
                    correct: 0,
                    points: 15,
                    category: "Básico",
                    difficulty: "Fácil",
                    timeLimit: 30
                },
                {
                    id: 12,
                    question: "¿En qué continente nació la IAM?",
                    answers: ["Europa", "América", "Asia", "África"],
                    correct: 0,
                    points: 15,
                    category: "Historia",
                    difficulty: "Fácil",
                    timeLimit: 25
                },
                {
                    id: 13,
                    question: "¿Qué significa 'DOMUND'?",
                    answers: [
                        "Domingo Mundial de las Misiones",
                        "Donación Mundial para la Iglesia",
                        "Domingo de la Misericordia Universal",
                        "Día Oficial Mundial de la Unión Divina"
                    ],
                    correct: 0,
                    points: 20,
                    category: "Fechas",
                    difficulty: "Intermedio", 
                    timeLimit: 30
                },
                {
                    id: 14,
                    question: "¿Cuál es la edad aproximada para participar en la IAM?",
                    answers: [
                        "Desde los 6 hasta los 14 años aproximadamente",
                        "Solo adolescentes de 13 a 17 años",
                        "Adultos mayores de 18 años",
                        "Solo niños menores de 10 años"
                    ],
                    correct: 0,
                    points: 15,
                    category: "Organización",
                    difficulty: "Fácil",
                    timeLimit: 30
                },
                {
                    id: 15,
                    question: "¿Qué santo es patrón de las misiones?",
                    answers: [
                        "San Francisco Javier",
                        "San José",
                        "Santa Teresa de Calcuta", 
                        "San Juan Pablo II"
                    ],
                    correct: 0,
                    points: 20,
                    category: "Santos",
                    difficulty: "Intermedio",
                    timeLimit: 30
                },
                {
                    id: 16,
                    question: "¿Cómo se llama el mensaje del Papa para el DOMUND?",
                    answers: [
                        "Mensaje Misionero",
                        "Encíclica Misionera",
                        "Carta Apostólica",
                        "Exhortación Apostólica"
                    ],
                    correct: 0,
                    points: 25,
                    category: "Fechas",
                    difficulty: "Difícil",
                    timeLimit: 35
                },
                {
                    id: 17,
                    question: "¿Qué colores tiene el logotipo de la IAM?",
                    answers: [
                        "Verde, amarillo y blanco",
                        "Azul, rojo y blanco", 
                        "Verde, rojo y amarillo",
                        "Azul, amarillo y negro"
                    ],
                    correct: 0,
                    points: 15,
                    category: "Básico",
                    difficulty: "Fácil",
                    timeLimit: 25
                },
                {
                    id: 18,
                    question: "¿Cuál es el lema bíblico de la IAM?",
                    answers: [
                        "De los niños es el Reino de los cielos",
                        "Vayan y hagan discípulos a todas las naciones",
                        "Amad a vuestros enemigos",
                        "Buscad primero el Reino de Dios"
                    ],
                    correct: 0,
                    points: 20,
                    category: "Espiritualidad",
                    difficulty: "Intermedio",
                    timeLimit: 30
                },
                {
                    id: 19,
                    question: "¿Qué continente fue el primero en recibir la IAM fuera de Europa?",
                    answers: ["América", "Asia", "África", "Oceanía"],
                    correct: 0,
                    points: 25,
                    category: "Historia",
                    difficulty: "Difícil",
                    timeLimit: 35
                },
                {
                    id: 20,
                    question: "¿Qué significa 'Obra Pontificia'?",
                    answers: [
                        "Que está bajo la dirección directa del Papa",
                        "Que está en el Vaticano",
                        "Que solo la dirigen sacerdotes",
                        "Que fue fundada por un Papa"
                    ],
                    correct: 0,
                    points: 20,
                    category: "Organización",
                    difficulty: "Intermedio",
                    timeLimit: 30
                }
            ],
            adivinanza: [
                {
                    id: 21,
                    question: "Soy una obra pontificia donde los niños ayudan a otros niños. ¿Quién soy?",
                    answers: ["La IAM", "Cáritas", "Manos Unidas", "Misiones Diocesanas"],
                    correct: 0,
                    points: 20,
                    category: "Adivinanza",
                    difficulty: "Fácil",
                    timeLimit: 30
                },
                {
                    id: 22,
                    question: "Soy verde, represento esperanza, y me llevan los niños misioneros. ¿Qué soy?",
                    answers: ["La pañoleta IAM", "Una bandera", "Un uniforme", "Un estandarte"],
                    correct: 0,
                    points: 20,
                    category: "Adivinanza",
                    difficulty: "Fácil",
                    timeLimit: 30
                }
            ],
            trivia: [
                {
                    id: 23,
                    question: "¿En qué año el Papa Pío XI declaró la IAM como Obra Pontificia?",
                    answers: ["1922", "1900", "1950", "1843"],
                    correct: 0,
                    points: 25,
                    category: "Historia",
                    difficulty: "Difícil",
                    timeLimit: 30
                },
                {
                    id: 24,
                    question: "¿Cuántos continentes abarca actualmente la IAM?",
                    answers: ["5", "4", "6", "7"],
                    correct: 0,
                    points: 20,
                    category: "Datos",
                    difficulty: "Fácil",
                    timeLimit: 25
                }
            ]
        };

        const questions = questionBank[gameType] || questionBank.preguntas;

        // Mezclar preguntas aleatoriamente
        const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

        // Tomar el número solicitado de preguntas
        return shuffledQuestions.slice(0, totalQuestions).map((q, index) => ({
            ...q,
            displayNumber: index + 1
        }));
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
        
        const question = this.currentGame.questions[this.currentQuestionIndex] || this.currentGame.questions[0];
        const questionId = question.id;
        
        // Verificar si ya respondió
        const hasAnswered = this.hasPlayerAnswered(questionId);
        
        const html = `
            <div class="active-game-info">
                <div class="radio-game-timer">
                    <i class="fas fa-clock"></i>
                    <span id="questionTimer">${question.timeLimit || 30}</span> segundos
                </div>
                <div class="radio-game-question">
                    ${question.question}
                </div>
                <div class="radio-game-answers">
                    ${question.answers.map((answer, index) => `
                        <button class="radio-game-answer-btn" 
                                data-index="${index}" 
                                data-question="${question.id}"
                                ${hasAnswered ? 'disabled' : ''}>
                            ${String.fromCharCode(65 + index)}) ${answer}
                        </button>
                    `).join('')}
                </div>
                ${hasAnswered ? `
                    <p style="text-align: center; margin-top: 15px; color: var(--warning); font-size: 0.9rem;">
                        <i class="fas fa-check-circle"></i> Ya respondiste esta pregunta
                    </p>
                ` : `
                    <p style="text-align: center; margin-top: 15px; color: var(--text-light); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Tienes ${question.timeLimit || 30} segundos. Solo puedes responder una vez.
                    </p>
                `}
            </div>
        `;
        
        const currentGameInfo = document.getElementById('radioCurrentGameInfo');
        if (currentGameInfo) {
            currentGameInfo.innerHTML = html;
        }
        
        // Iniciar temporizador si no ha respondido
        if (!hasAnswered && this.currentPlayer) {
            this.startQuestionTimer(questionId, question.timeLimit || 30);
        }
        
        // Agregar eventos a los botones de respuesta
        document.querySelectorAll('.radio-game-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = parseInt(e.target.dataset.question);
                const answerIndex = parseInt(e.target.dataset.index);
                this.submitAnswer(questionId, answerIndex);
            });
        });
    }

    startAdminStats() {
        if (!this.isAdmin) return;
        
        // Actualizar estadísticas cada segundo
        this.adminStatsInterval = setInterval(() => {
            this.updateAdminStats();
        }, 1000);
    }

    updateAdminStats() {
        if (!this.isAdmin || !document.getElementById('adminConnectedPlayers')) return;

        // Jugadores conectados (últimos 5 minutos)
        const connectedPlayers = this.players.filter(p => {
            if (!p.lastActive) return false;
            const lastActive = new Date(p.lastActive);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return lastActive > fiveMinutesAgo;
        }).length;

        // Actualizar UI
        document.getElementById('adminConnectedPlayers').textContent = connectedPlayers;

        if (this.currentGame && this.gameActive) {
            const currentQ = this.currentQuestionIndex + 1;
            const totalQ = this.currentGame.questions?.length || 0;
            document.getElementById('adminCurrentQuestion').textContent = `${currentQ}/${totalQ}`;

            // Tiempo restante
            const timeLeft = this.gameDuration - Math.floor((Date.now() - new Date(this.currentGame.startTime).getTime()) / 1000);
            const minutes = Math.floor(Math.max(0, timeLeft) / 60);
            const seconds = Math.max(0, timeLeft) % 60;
            document.getElementById('adminTimeRemaining').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('adminCurrentQuestion').textContent = '0/0';
            document.getElementById('adminTimeRemaining').textContent = '00:00';
        }

        // Puntos totales
        const totalPoints = this.players.reduce((sum, p) => sum + (p.points || 0), 0);
        document.getElementById('adminTotalPoints').textContent = totalPoints;
    }

    // Función para previsualizar preguntas
    previewQuestions() {
        if (!this.isAdmin) return;

        const gameType = document.getElementById('radioGameType')?.value || 'preguntas';
        const totalQuestions = parseInt(document.getElementById('radioTotalQuestions')?.value || 10);
        const difficulty = document.getElementById('radioGameDifficulty')?.value || 'all';

        const questions = this.generateQuestions(gameType, totalQuestions);

        // Filtrar por dificultad
        let filteredQuestions = questions;
        if (difficulty !== 'all') {
            filteredQuestions = questions.filter(q => {
                if (difficulty === 'easy') return q.difficulty === 'Fácil';
                if (difficulty === 'medium') return q.difficulty === 'Fácil' || q.difficulty === 'Intermedio';
                if (difficulty === 'hard') return true;
                return true;
            });
        }

        const previewHTML = filteredQuestions.map((q, index) => `
            <div class="question-item">
                <div class="question-number">${index + 1}</div>
                <div class="question-text">
                    <strong>${q.question}</strong>
                    <div style="font-size: 0.8rem; margin-top: 5px; color: #666;">
                        ${q.category} • ${q.points} puntos • ${q.timeLimit || 30}s
                    </div>
                </div>
                <div class="question-difficulty difficulty-${q.difficulty.toLowerCase()}">
                    ${q.difficulty}
                </div>
            </div>
        `).join('');

        const previewContainer = document.getElementById('radioQuestionsPreview');
        if (previewContainer) {
            previewContainer.innerHTML = previewHTML || '<p>No hay preguntas disponibles con esta configuración.</p>';
        }
    }

    setupQuestionPreview() {
        if (!this.isAdmin) return;

        const previewBtn = document.getElementById('radioPreviewQuestionsBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.previewQuestions();
            });
        }

        // Actualizar preview cuando cambie la configuración
        ['radioGameType', 'radioTotalQuestions', 'radioGameDifficulty'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.previewQuestions();
                });
            }
        });
    }

    startQuestionTimer(questionId, seconds) {
        if (this.questionTimer) clearInterval(this.questionTimer);
        
        let timeLeft = seconds;
        const timerElement = document.getElementById('questionTimer');
        
        if (!timerElement) return;
        
        this.questionTimer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            // Cambiar color cuando quede poco tiempo
            if (timeLeft <= 10) {
                timerElement.style.color = 'var(--danger)';
                timerElement.style.fontWeight = 'bold';
            } else {
                timerElement.style.color = 'var(--primary)';
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.questionTimer);
                
                // Deshabilitar botones cuando se acaba el tiempo
                document.querySelectorAll('.radio-game-answer-btn').forEach(btn => {
                    btn.disabled = true;
                });
                
                // Marcar como respondida (pero incorrecta por tiempo)
                if (this.currentPlayer) {
                    const answeredKey = `answered_${questionId}_${this.currentPlayer.id}`;
                    localStorage.setItem(answeredKey, 'timeout');
                }
                
                // Mostrar mensaje
                const messageDiv = document.createElement('div');
                messageDiv.innerHTML = `
                    <p style="text-align: center; margin-top: 15px; color: var(--danger); font-size: 0.9rem;">
                        <i class="fas fa-hourglass-end"></i> ¡Tiempo agotado!
                    </p>
                `;
                const activeGame = document.querySelector('.active-game-info');
                if (activeGame) {
                    activeGame.appendChild(messageDiv);
                }
                
                // Mostrar notificación
                this.showNotification('¡Tiempo agotado!', 'error');
            }
        }, 1000);
    }

    hasPlayerAnswered(questionId) {
        if (!this.currentPlayer) return false;
        const answeredKey = `answered_${questionId}_${this.currentPlayer.id}`;
        return localStorage.getItem(answeredKey) !== null;
    }

    clearAnsweredQuestions() {
        if (!this.currentPlayer) return;
        
        // Limpiar todas las respuestas de este jugador
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`answered_`) && key.includes(this.currentPlayer.id)) {
                localStorage.removeItem(key);
            }
        }
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

        // Validar nombre (solo letras y espacios)
        const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,30}$/;
        if (!nameRegex.test(name)) {
            this.showNotification('Nombre inválido. Solo letras (2-30 caracteres)', 'error');
            return;
        }

        // Validar email si se proporciona
        if (email && !this.validateEmail(email)) {
            this.showNotification('Email inválido', 'error');
            return;
        }

        // Validar teléfono si se proporciona
        if (phone && !this.validatePhone(phone)) {
            this.showNotification('Teléfono inválido (solo números)', 'error');
            return;
        }

        // Verificar si el nombre ya está registrado y ACTIVO en los últimos 30 minutos
        const isDuplicate = await this.checkDuplicatePlayer(name);

        if (isDuplicate) {
            this.showNotification(`El nombre "${name}" ya está jugando. Usa un apodo o variación.`, 'error');
            return;
        }

        // Cargar jugadores existentes
        const result = await window.radioBackend.getRadioPlayers();
        const existingPlayers = result.success ? result.data : [];

        // Buscar si ya existe un jugador con el mismo nombre
        const existingPlayer = existingPlayers.find(p => 
            p.name.toLowerCase() === name.toLowerCase()
        );

        if (existingPlayer) {
            // Preguntar si quiere usar el jugador existente
            const useExisting = confirm(`¿Eres ${existingPlayer.name}? Si es así, haz clic en "Aceptar". Si eres otra persona, haz clic en "Cancelar" y usa un apodo.`);

            if (useExisting) {
                // Usar jugador existente
                this.currentPlayer = existingPlayer;
                this.currentPlayer.lastActive = new Date().toISOString();

                // Actualizar datos si cambió teléfono o email
                if (phone) this.currentPlayer.phone = phone;
                if (email) this.currentPlayer.email = email;

                // Guardar en localStorage para referencia
                localStorage.setItem('radioPlayer', JSON.stringify(this.currentPlayer));
                localStorage.setItem('radioPlayerId', this.currentPlayer.id);
                localStorage.setItem('playerSessionStart', new Date().toISOString());

                // Configurar chat
                if (window.radioChat) {
                    window.radioChat.setUserName(name);
                }

                this.showNotification(`¡Bienvenido de nuevo ${name}!`, 'success');

                // Anunciar en el chat
                if (window.radioChat) {
                    window.radioChat.sendMessage(`👋 ¡Hola a todos! Soy ${name} de vuelta`, 'greeting');
                }
            } else {
                this.showNotification('Por favor, usa un apodo o tu nombre completo para diferenciarte.', 'info');
                return;
            }
        } else {
            // Crear nuevo jugador con ID único
            const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

            const result = await window.radioBackend.saveRadioPlayer({
                id: playerId,
                name: name,
                phone: phone,
                email: email,
                points: 0,
                gamesPlayed: 0,
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                sessionId: 'session_' + Date.now()
            });

            if (result.success) {
                this.currentPlayer = result.player;

                // Guardar en localStorage
                localStorage.setItem('radioPlayer', JSON.stringify(this.currentPlayer));
                localStorage.setItem('radioPlayerId', this.currentPlayer.id);
                localStorage.setItem('playerSessionStart', new Date().toISOString());

                // Configurar chat
                if (window.radioChat) {
                    window.radioChat.setUserName(name);
                }

                this.showNotification(`¡Bienvenido ${name}! Listo para jugar.`, 'success');

                // Anunciar en el chat
                if (window.radioChat) {
                    window.radioChat.sendMessage(`👋 ¡Hola a todos! Soy ${name}, nuevo jugador`, 'greeting');
                }
            } else {
                this.showNotification('Error al registrarse. Intenta nuevamente.', 'error');
                return;
            }
        }

        // Resetear formulario
        const registerForm = document.getElementById('radioRegisterPlayerForm');
        if (registerForm) {
            registerForm.reset();
        }

        // Recargar lista de jugadores
        this.loadPlayers();

        // Registrar sesión activa
        this.registerActiveSession(name);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
        return phoneRegex.test(phone);
    }

    async checkDuplicatePlayer(name) {
        const result = await window.radioBackend.getRadioPlayers();
        if (!result.success) return false;

        const players = result.data;
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Buscar jugadores con el mismo nombre que estén activos (últimos 30 min)
        const duplicate = players.find(player => {
            if (player.name.toLowerCase() === name.toLowerCase()) {
                if (player.lastActive) {
                    const lastActive = new Date(player.lastActive);
                    return lastActive > thirtyMinutesAgo;
                }
            }
            return false;
        });

        return duplicate !== undefined;
    }

    registerActiveSession(playerName) {
        const activeSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
        activeSessions[playerName.toLowerCase()] = {
            startTime: new Date().toISOString(),
            playerName: playerName
        };
        localStorage.setItem('activeSessions', JSON.stringify(activeSessions));

        // Limpiar sesiones antiguas cada 5 minutos
        this.cleanupOldSessions();
    }

    cleanupOldSessions() {
        const activeSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        Object.keys(activeSessions).forEach(key => {
            const session = activeSessions[key];
            if (new Date(session.startTime) < oneHourAgo) {
                delete activeSessions[key];
            }
        });

        localStorage.setItem('activeSessions', JSON.stringify(activeSessions));
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
        
        // Verificar si ya respondió esta pregunta
        if (this.hasPlayerAnswered(questionId)) {
            this.showNotification('Ya respondiste esta pregunta', 'warning');
            return;
        }
        
        // Deshabilitar botones de respuesta
        document.querySelectorAll('.radio-game-answer-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        // Detener temporizador
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
        }
        
        const question = this.currentGame.questions.find(q => q.id === questionId);
        if (!question) {
            this.showNotification('Pregunta no encontrada', 'error');
            return;
        }
        
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            const pointsToAdd = question.points;
            
            // Guardar que ya respondió correctamente
            const answeredKey = `answered_${questionId}_${this.currentPlayer.id}`;
            localStorage.setItem(answeredKey, 'correct');
            
            // Actualizar puntos del jugador existente
            const result = await this.updatePlayerScore(pointsToAdd);
            
            if (result.success) {
                this.showNotification(`¡Respuesta correcta! +${pointsToAdd} puntos`, 'success');
                
                // Anunciar en el chat
                if (window.radioChat) {
                    window.radioChat.sendMessage(
                        `🎯 ${this.currentPlayer.name} respondió correctamente y ganó ${pointsToAdd} puntos!`,
                        'system'
                    );
                }
                
                // Actualizar ranking
                this.loadPlayers();
                
                // Resaltar respuesta correcta
                this.highlightCorrectAnswer(questionId, answerIndex);
            }
        } else {
            // Guardar que respondió incorrectamente
            const answeredKey = `answered_${questionId}_${this.currentPlayer.id}`;
            localStorage.setItem(answeredKey, 'incorrect');
            
            this.showNotification('Respuesta incorrecta', 'error');
            
            // Mostrar respuesta correcta
            this.highlightCorrectAnswer(questionId, question.correct);
        }
    }

    highlightCorrectAnswer(questionId, correctIndex) {
        // Resaltar la respuesta correcta en verde
        document.querySelectorAll('.radio-game-answer-btn').forEach((btn, index) => {
            if (index === correctIndex) {
                btn.style.backgroundColor = 'var(--success)';
                btn.style.color = 'white';
                btn.style.borderColor = 'var(--success)';
            } else if (parseInt(btn.dataset.index) !== correctIndex) {
                btn.style.opacity = '0.6';
            }
        });
    }

    async updatePlayerScore(pointsToAdd) {
        if (!this.currentPlayer) return { success: false, error: 'No hay jugador' };
        
        const localPlayers = JSON.parse(localStorage.getItem('radioPlayers') || '[]');
        let playerIndex = -1;
        
        // Buscar jugador por ID o por nombre
        playerIndex = localPlayers.findIndex(p => p.id === this.currentPlayer.id);
        
        if (playerIndex === -1) {
            // Buscar por nombre (para evitar duplicados)
            const currentPlayer = localPlayers.find(p => 
                p.name.toLowerCase() === this.currentPlayer.name.toLowerCase()
            );
            if (currentPlayer) {
                playerIndex = localPlayers.indexOf(currentPlayer);
            }
        }
        
        if (playerIndex !== -1) {
            // Actualizar jugador existente
            localPlayers[playerIndex].points = (localPlayers[playerIndex].points || 0) + pointsToAdd;
            localPlayers[playerIndex].gamesPlayed = (localPlayers[playerIndex].gamesPlayed || 0) + 1;
            localPlayers[playerIndex].lastActive = new Date().toISOString();
            
            // Actualizar jugador actual
            this.currentPlayer = localPlayers[playerIndex];
            
            // Guardar jugador actualizado
            localStorage.setItem('radioPlayer', JSON.stringify(this.currentPlayer));
        } else {
            // Crear nuevo jugador si no existe
            const newPlayer = {
                id: this.currentPlayer.id || 'player_' + Date.now(),
                name: this.currentPlayer.name,
                phone: this.currentPlayer.phone || '',
                email: this.currentPlayer.email || '',
                points: pointsToAdd,
                gamesPlayed: 1,
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString()
            };
            localPlayers.push(newPlayer);
            this.currentPlayer = newPlayer;
        }
        
        localStorage.setItem('radioPlayers', JSON.stringify(localPlayers));
        
        // También actualizar en Firebase
        if (window.radioBackend && window.radioBackend.isInitialized && this.currentPlayer.id) {
            await window.radioBackend.updatePlayerScore(this.currentPlayer.id, pointsToAdd);
        }
        
        return { success: true, player: this.currentPlayer };
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
            const participantsCount = document.getElementById('radioParticipantsCount');
            if (participantsCount) {
                participantsCount.textContent = count;
            }
            
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
        
        const gamesPlayedEl = document.getElementById('radioGamesPlayed');
        const totalPointsEl = document.getElementById('radioTotalPoints');
        const totalPlayersEl = document.getElementById('radioTotalPlayers');
        
        if (gamesPlayedEl) gamesPlayedEl.textContent = gamesPlayed;
        if (totalPointsEl) totalPointsEl.textContent = totalPoints;
        if (totalPlayersEl) totalPlayersEl.textContent = this.players.length;
    }

    calculateWinners() {
        // Filtrar jugadores con al menos 1 juego
        const activePlayers = this.players.filter(p => (p.gamesPlayed || 0) > 0);
        
        // Ordenar por puntos
        const sortedPlayers = [...activePlayers].sort((a, b) => (b.points || 0) - (a.points || 0));
        
        // Guardar ganadores en localStorage
        localStorage.setItem('lastWinners', JSON.stringify(sortedPlayers.slice(0, 3)));
        
        return sortedPlayers;
    }

    // ===== SISTEMA DE CHAT =====
    async sendChatMessage() {
        const messageInput = document.getElementById('radioChatMessage');
        const message = messageInput?.value.trim();
        
        if (!message) return;
        
        if (window.radioChat) {
            await window.radioChat.sendMessage(message, 'message');
        } else {
            // Modo local si no hay chat en vivo
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
        }
        
        // Limpiar input
        if (messageInput) {
            messageInput.value = '';
            messageInput.focus();
        }
    }

    sendPrayerIntent() {
        const messageInput = document.getElementById('radioChatMessage');
        if (messageInput) {
            messageInput.value = '🙏 Envío mi intención de oración para el programa';
            messageInput.focus();
        }
    }

    sendGreeting() {
        const playerName = this.currentPlayer ? this.currentPlayer.name : 'Oyente';
        const messageInput = document.getElementById('radioChatMessage');
        if (messageInput) {
            messageInput.value = `¡Hola a todos! Soy ${playerName}, un saludo desde mi casa. ¡Viva la IAM!`;
            messageInput.focus();
        }
    }

    sendQuestion() {
        const messageInput = document.getElementById('radioChatMessage');
        if (messageInput) {
            messageInput.value = '❓ Tengo una pregunta sobre...';
            messageInput.focus();
        }
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
            
            const isCurrentUser = this.currentPlayer && msg.playerName === this.currentPlayer.name;
            
            return `
                <div class="radio-chat-message ${isCurrentUser ? 'own-message' : ''}">
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
        if (this.questionTimer) clearInterval(this.questionTimer);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (this.gameListener) clearInterval(this.gameListener);
        if (this.playersListener) clearInterval(this.playersListener);
        
        // Limpiar intervalo de estadísticas del admin
        if (this.adminStatsInterval) {
            clearInterval(this.adminStatsInterval);
        }
        
        // Limpiar chat
        if (window.radioChat) {
            window.radioChat.cleanup();
        }
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