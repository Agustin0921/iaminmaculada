// Script específico para la página de Radio Morenita del Valle 104.5
// Integrado con el sistema de administración existente de IAM

// ===== CONFIGURACIÓN INICIAL =====
document.addEventListener('DOMContentLoaded', function() {
    console.log("📻 Inicializando Radio Morenita del Valle 104.5...");
    
    // Estado de la radio
    window.radioState = {
        isPlaying: false,
        currentStream: 'radio',
        currentGame: null,
        isAdminLogged: false,
        listeners: 0,
        activePlayers: 0,
        gameInterval: null,
        audio: null,
        currentListeners: [],
        listenerInterval: null
    };
    
    // URLs de streaming
    window.radioStreams = {
        radio: 'https://stream.radiomorenita.com/live',
        youtube: 'https://www.youtube.com/live/@radiomorenitadelvalle',
        mixlr: 'https://mixlr.com/radiomorenita'
    };
    
    // Inicializar radio
    initRadio();
});

// ===== FUNCIONES PRINCIPALES =====
function initRadio() {
    // Elementos del DOM
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const volumeControl = document.getElementById('volumeControl');
    const streamOptions = document.querySelectorAll('.stream-option');
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    const gameCards = document.querySelectorAll('.game-card');
    const gameModal = document.getElementById('gameModal');
    const closeGameModal = document.getElementById('closeGameModal');
    const gameContent = document.getElementById('gameContent');
    const startGameBtn = document.getElementById('startGameBtn');
    const stopGameBtn = document.getElementById('stopGameBtn');
    const resetGameBtn = document.getElementById('resetGameBtn');
    const viewResultsBtn = document.getElementById('viewResultsBtn');
    const currentGameStatus = document.getElementById('currentGameStatus');
    const playerCount = document.getElementById('playerCount');
    const listenerCount = document.getElementById('listenerCount');
    const listenersList = document.getElementById('listenersList');
    const recordProgramBtn = document.getElementById('recordProgramBtn');
    
    console.log("✅ Elementos del DOM encontrados");
    
    // 1. Configurar botón de play/pause
    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }
    
    // 2. Configurar control de volumen
    if (volumeControl) {
        volumeControl.addEventListener('input', function() {
            const volume = this.value / 100;
            if (window.radioState.audio) {
                window.radioState.audio.volume = volume;
            }
            updateVolumeBars(volume);
        });
    }
    
    // 3. Configurar opciones de streaming
    streamOptions.forEach(option => {
        option.addEventListener('click', function() {
            const streamType = this.dataset.stream;
            selectStream(streamType);
        });
    });
    
    // 4. Configurar botón admin (usar el sistema existente)
    if (adminAccessBtn) {
        // Usar el sistema de admin existente
        adminAccessBtn.addEventListener('click', function() {
            if (window.radioState.isAdminLogged) {
                showNotification('Sesión cerrada', 'Has salido del panel de control del animador.');
                logoutRadioAdmin();
            } else {
                // Abrir modal de login existente
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                } else {
                    showNotification('Acceso admin', 'Usa el botón del menú principal para acceder como admin.');
                }
            }
        });
    }
    
    // 5. Configurar botones de control del juego
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startSelectedGame);
    }
    
    if (stopGameBtn) {
        stopGameBtn.addEventListener('click', stopCurrentGame);
    }
    
    if (resetGameBtn) {
        resetGameBtn.addEventListener('click', resetCurrentGame);
    }
    
    if (viewResultsBtn) {
        viewResultsBtn.addEventListener('click', viewGameResults);
    }
    
    // 6. Configurar game cards
    gameCards.forEach(card => {
        card.addEventListener('click', function() {
            if (!window.radioState.isAdminLogged) {
                showNotification('Acceso restringido', 'Solo el animador puede seleccionar juegos.');
                return;
            }
            
            const gameType = this.dataset.game;
            selectGame(gameType);
        });
    });
    
    // 7. Configurar modal de juego
    if (closeGameModal) {
        closeGameModal.addEventListener('click', function() {
            gameModal.style.display = 'none';
        });
    }
    
    // 8. Configurar botón de programas anteriores
    if (recordProgramBtn) {
        recordProgramBtn.addEventListener('click', function() {
            window.open('https://www.youtube.com/@radiomorenitadelvalle/videos', '_blank');
        });
    }
    
    // 9. Inicializar contador de oyentes en tiempo real
    initListenerCounter();
    
    // 10. Verificar si ya hay admin logueado
    checkRadioAdminStatus();
    
    // 11. Configurar reproducción de YouTube
    setupYouTubePlayer();
}

// ===== SISTEMA DE OYENTES EN TIEMPO REAL =====
function initListenerCounter() {
    // Cargar oyentes iniciales desde localStorage
    const savedListeners = localStorage.getItem('radioListeners');
    if (savedListeners) {
        try {
            const data = JSON.parse(savedListeners);
            window.radioState.listeners = data.count || 0;
            window.radioState.currentListeners = data.listeners || [];
        } catch (e) {
            console.warn("No se pudieron cargar oyentes guardados");
        }
    }
    
    // Actualizar display
    updateListenerDisplay();
    updateListenersAvatars();
    
    // Simular cambios en tiempo real
    window.radioState.listenerInterval = setInterval(() => {
        simulateRealTimeListeners();
    }, 15000); // Cada 15 segundos
}

function simulateRealTimeListeners() {
    // Base de oyentes (entre 30 y 100 para simulación)
    const baseListeners = Math.floor(Math.random() * 70) + 30;
    
    // Variación aleatoria
    const variation = Math.floor(Math.random() * 10) - 5;
    window.radioState.listeners = Math.max(0, baseListeners + variation);
    
    // Actualizar display
    updateListenerDisplay();
    updateListenersAvatars();
    
    // Guardar en localStorage
    saveListenersToStorage();
}

function updateListenerDisplay() {
    const listenerCount = document.getElementById('listenerCount');
    if (listenerCount) {
        listenerCount.textContent = window.radioState.listeners;
        
        // Efecto visual cuando hay muchos oyentes
        if (window.radioState.listeners > 50) {
            listenerCount.style.color = '#FFB347';
            listenerCount.style.textShadow = '0 0 10px rgba(255, 179, 71, 0.5)';
        } else {
            listenerCount.style.color = 'white';
            listenerCount.style.textShadow = 'none';
        }
    }
}

function updateListenersAvatars() {
    const listenersList = document.getElementById('listenersList');
    if (!listenersList) return;
    
    // Limpiar lista
    listenersList.innerHTML = '';
    
    // Si no hay oyentes
    if (window.radioState.listeners === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'listener-message';
        emptyMsg.textContent = 'Sé el primero en escuchar';
        emptyMsg.style.color = 'rgba(255,255,255,0.7)';
        emptyMsg.style.fontStyle = 'italic';
        listenersList.appendChild(emptyMsg);
        return;
    }
    
    // Iconos personalizados (sin emojis)
    const icons = [
        'fas fa-headphones',
        'fas fa-music',
        'fas fa-user',
        'fas fa-child',
        'fas fa-user-friends',
        'fas fa-microphone-alt',
        'fas fa-heart',
        'fas fa-star'
    ];
    
    // Colores para avatares
    const colors = [
        '#2A6EBB', // Azul IAM
        '#FFB347', // Naranja
        '#FF6B8B', // Rosa
        '#38B2AC', // Turquesa
        '#9C27B0', // Púrpura
        '#4CAF50', // Verde
        '#FF9800', // Naranja oscuro
        '#2196F3'  // Azul claro
    ];
    
    // Crear avatares (máximo 15 visibles)
    const visibleCount = Math.min(window.radioState.listeners, 15);
    
    for (let i = 0; i < visibleCount; i++) {
        const avatar = document.createElement('div');
        avatar.className = 'listener-avatar';
        
        // Seleccionar icono y color
        const iconClass = icons[Math.floor(Math.random() * icons.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        avatar.innerHTML = `<i class="${iconClass}"></i>`;
        avatar.style.background = color;
        avatar.style.border = '2px solid white';
        avatar.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
        
        // Animación escalonada
        avatar.style.animationDelay = `${i * 0.1}s`;
        avatar.style.opacity = '0.9';
        
        // Tooltip con número de oyente
        avatar.title = `Oyente #${i + 1}`;
        
        listenersList.appendChild(avatar);
    }
    
    // Si hay más oyentes de los visibles, mostrar contador
    if (window.radioState.listeners > 15) {
        const moreCount = document.createElement('div');
        moreCount.className = 'listener-avatar more-count';
        moreCount.textContent = `+${window.radioState.listeners - 15}`;
        moreCount.style.background = 'linear-gradient(135deg, #FFB347, #FF9800)';
        moreCount.style.fontSize = '0.8rem';
        moreCount.style.fontWeight = 'bold';
        moreCount.title = `${window.radioState.listeners - 15} oyentes más`;
        listenersList.appendChild(moreCount);
    }
}

function saveListenersToStorage() {
    const data = {
        count: window.radioState.listeners,
        listeners: window.radioState.currentListeners,
        lastUpdate: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('radioListeners', JSON.stringify(data));
    } catch (e) {
        console.warn("No se pudieron guardar oyentes");
    }
}

// ===== SISTEMA DE REPRODUCCIÓN =====
function setupYouTubePlayer() {
    // YouTube API se carga dinámicamente
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Variable global para el reproductor de YouTube
    window.onYouTubeIframeAPIReady = function() {
        console.log("YouTube API lista");
    };
}

function togglePlay() {
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const nowPlaying = document.getElementById('nowPlaying');
    
    if (window.radioState.isPlaying) {
        // Pausar
        if (window.radioState.audio) {
            window.radioState.audio.pause();
        }
        playIcon.className = 'fas fa-play';
        playBtn.classList.remove('playing');
        window.radioState.isPlaying = false;
        
        // Disminuir oyentes
        window.radioState.listeners = Math.max(0, window.radioState.listeners - 1);
        updateListenerDisplay();
        
        showNotification('Radio pausada', 'Has pausado la transmisión.');
    } else {
        // Reproducir
        playStream(window.radioState.currentStream);
        playIcon.className = 'fas fa-pause';
        playBtn.classList.add('playing');
        window.radioState.isPlaying = true;
        
        // Aumentar oyentes
        window.radioState.listeners += 1;
        updateListenerDisplay();
        
        // Agregar a lista de oyentes actuales
        const listenerId = 'user_' + Date.now();
        window.radioState.currentListeners.push({
            id: listenerId,
            joined: new Date().toISOString()
        });
        
        showNotification('¡Radio en vivo!', 'Escuchando Radio Morenita del Valle 104.5 FM');
        
        if (nowPlaying) {
            nowPlaying.innerHTML = `<i class="fas fa-headphones"></i> Escuchando: Con Corazón Misionero`;
        }
    }
}

function playStream(streamType) {
    console.log(`▶️ Reproduciendo: ${streamType}`);
    
    // Detener audio anterior
    if (window.radioState.audio) {
        window.radioState.audio.pause();
        window.radioState.audio = null;
    }
    
    // Crear nuevo elemento de audio
    window.radioState.audio = new Audio();
    window.radioState.audio.volume = volumeControl.value / 100;
    
    // Configurar según tipo de stream
    switch(streamType) {
        case 'youtube':
            // Para YouTube usar iframe
            openYouTubePlayer();
            break;
        case 'mixlr':
            window.radioState.audio.src = window.radioStreams.mixlr;
            window.radioState.audio.play().catch(e => console.log("Error reproduciendo:", e));
            break;
        case 'radio':
        default:
            // Stream directo simulado
            window.radioState.audio.src = window.radioStreams.radio;
            window.radioState.audio.play().catch(e => {
                console.log("Stream directo no disponible, usando simulación");
                // Simulación de audio para desarrollo
                simulateAudio();
            });
            break;
    }
}

function selectStream(streamType) {
    window.radioState.currentStream = streamType;
    
    // Actualizar UI
    const streamOptions = document.querySelectorAll('.stream-option');
    streamOptions.forEach(option => {
        if (option.dataset.stream === streamType) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Si está reproduciendo, cambiar stream
    if (window.radioState.isPlaying) {
        playStream(streamType);
    }
    
    showNotification('Fuente cambiada', `Ahora escuchas por: ${getStreamName(streamType)}`);
}

function getStreamName(streamType) {
    const names = {
        radio: 'FM 104.5 Directo',
        youtube: 'YouTube Live',
        mixlr: 'Stream Online'
    };
    return names[streamType] || streamType;
}

function updateVolumeBars(volume) {
    const audioBars = document.querySelectorAll('.audio-bar');
    if (!audioBars.length) return;
    
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

// ===== SISTEMA DE JUEGOS CONTROLADO POR ADMIN =====
function checkRadioAdminStatus() {
    // Verificar si el admin está logueado en el sistema principal
    const adminLogged = localStorage.getItem('adminLoggedIn') === 'true';
    const adminEmail = localStorage.getItem('adminEmail');
    
    if (adminLogged && adminEmail) {
        loginRadioAdmin(adminEmail, true);
    }
}

function loginRadioAdmin(username, isAutoLogin = false) {
    window.radioState.isAdminLogged = true;
    const adminPanel = document.getElementById('adminPanel');
    
    if (adminPanel) {
        adminPanel.style.display = 'block';
    }
    
    // Desbloquear juegos
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.classList.remove('locked');
        const status = card.querySelector('.game-status');
        if (status) {
            status.innerHTML = '<i class="fas fa-unlock"></i> DISPONIBLE';
            status.className = 'game-status available';
        }
        
        const btn = card.querySelector('button');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = 'Seleccionar juego';
        }
    });
    
    if (!isAutoLogin) {
        showNotification('Acceso concedido', 'Bienvenido al panel de control del animador.');
    }
    
    // Actualizar botón admin
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    if (adminAccessBtn) {
        adminAccessBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        adminAccessBtn.title = 'Cerrar sesión de animador';
    }
}

function logoutRadioAdmin() {
    window.radioState.isAdminLogged = false;
    const adminPanel = document.getElementById('adminPanel');
    
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
    
    // Bloquear juegos
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.classList.add('locked');
        const status = card.querySelector('.game-status');
        if (status) {
            status.innerHTML = '<i class="fas fa-lock"></i> BLOQUEADO';
            status.className = 'game-status locked';
        }
        
        const btn = card.querySelector('button');
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.textContent = 'Esperando al animador...';
        }
    });
    
    // Detener juego activo si hay uno
    if (window.radioState.currentGame) {
        stopCurrentGame();
    }
    
    // Actualizar botón admin
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    if (adminAccessBtn) {
        adminAccessBtn.innerHTML = '<i class="fas fa-user-shield"></i>';
        adminAccessBtn.title = 'Acceso Animadores';
    }
}

function selectGame(gameType) {
    if (!window.radioState.isAdminLogged) return;
    
    // Deseleccionar otros juegos
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.classList.remove('active');
    });
    
    // Seleccionar este juego
    const selectedCard = document.querySelector(`.game-card[data-game="${gameType}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        window.radioState.currentGame = gameType;
        
        const currentGameStatus = document.getElementById('currentGameStatus');
        if (currentGameStatus) {
            currentGameStatus.textContent = `Juego seleccionado: ${getGameName(gameType)}`;
        }
        
        showNotification('Juego seleccionado', `${getGameName(gameType)} listo para iniciar.`);
    }
}

function startSelectedGame() {
    if (!window.radioState.currentGame || !window.radioState.isAdminLogged) {
        showNotification('Error', 'Primero selecciona un juego del panel.');
        return;
    }
    
    startGame(window.radioState.currentGame);
}

function startGame(gameType) {
    if (!window.radioState.isAdminLogged) return;
    
    const currentGameStatus = document.getElementById('currentGameStatus');
    if (currentGameStatus) {
        currentGameStatus.textContent = `Juego ACTIVO: ${getGameName(gameType)}`;
        currentGameStatus.style.color = 'var(--success)';
    }
    
    // Mostrar modal con el juego
    showGameModal(gameType);
    
    // Simular jugadores conectados
    window.radioState.activePlayers = Math.floor(Math.random() * 50) + 10;
    updatePlayerCount();
    
    // Actualizar intervalos
    if (window.radioState.gameInterval) {
        clearInterval(window.radioState.gameInterval);
    }
    
    window.radioState.gameInterval = setInterval(updateGameStats, 2000);
    
    showNotification('¡Juego iniciado!', `${getGameName(gameType)} está ahora activo para todos.`);
}

function stopCurrentGame() {
    if (!window.radioState.currentGame || !window.radioState.isAdminLogged) return;
    
    // Detener juego
    if (window.radioState.gameInterval) {
        clearInterval(window.radioState.gameInterval);
        window.radioState.gameInterval = null;
    }
    
    const currentGameStatus = document.getElementById('currentGameStatus');
    if (currentGameStatus) {
        currentGameStatus.textContent = `Juego DETENIDO: ${getGameName(window.radioState.currentGame)}`;
        currentGameStatus.style.color = 'var(--danger)';
    }
    
    // Cerrar modal
    const gameModal = document.getElementById('gameModal');
    if (gameModal) {
        gameModal.style.display = 'none';
    }
    
    // Resetear jugadores
    window.radioState.activePlayers = 0;
    updatePlayerCount();
    
    showNotification('Juego detenido', `El juego ha sido finalizado.`);
}

function resetCurrentGame() {
    if (!window.radioState.currentGame || !window.radioState.isAdminLogged) return;
    
    // Reiniciar juego
    if (window.radioState.gameInterval) {
        clearInterval(window.radioState.gameInterval);
    }
    
    // Reiniciar estadísticas
    window.radioState.activePlayers = 0;
    updatePlayerCount();
    
    // Volver a empezar
    startGame(window.radioState.currentGame);
    
    showNotification('Juego reiniciado', `El juego ha sido reiniciado.`);
}

function updateGameStats() {
    if (!window.radioState.isAdminLogged || !window.radioState.currentGame) return;
    
    // Simular cambios en estadísticas del juego
    window.radioState.activePlayers += Math.floor(Math.random() * 3) - 1;
    if (window.radioState.activePlayers < 0) {
        window.radioState.activePlayers = 0;
    }
    
    updatePlayerCount();
}

function updatePlayerCount() {
    const playerCount = document.getElementById('playerCount');
    if (playerCount) {
        playerCount.textContent = `Jugadores conectados: ${window.radioState.activePlayers}`;
    }
}

function viewGameResults() {
    if (!window.radioState.currentGame || !window.radioState.isAdminLogged) {
        showNotification('Error', 'No hay juego activo para ver resultados.');
        return;
    }
    
    // Mostrar resultados (simulado)
    const results = [
        { name: 'María González', score: 950 },
        { name: 'Juan Pérez', score: 870 },
        { name: 'Ana Rodríguez', score: 820 },
        { name: 'Pedro Sánchez', score: 790 },
        { name: 'Lucía Fernández', score: 750 }
    ];
    
    let resultsHTML = '<div class="quiz-game">';
    resultsHTML += '<h3><i class="fas fa-trophy"></i> Top 5 Jugadores</h3>';
    resultsHTML += '<div style="background: white; border-radius: 10px; padding: 20px;">';
    
    results.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        resultsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; 
                        padding: 10px; border-bottom: 1px solid #eee;">
                <div>
                    <span style="font-size: 1.2rem; margin-right: 10px;">${medal}</span>
                    <strong>${player.name}</strong>
                </div>
                <div style="background: var(--primary); color: white; 
                            padding: 5px 15px; border-radius: 20px; font-weight: bold;">
                    ${player.score} pts
                </div>
            </div>
        `;
    });
    
    resultsHTML += '</div></div>';
    
    const gameContent = document.getElementById('gameContent');
    const gameModalHeader = document.getElementById('gameModalHeader');
    const gameModal = document.getElementById('gameModal');
    
    if (gameContent) gameContent.innerHTML = resultsHTML;
    if (gameModalHeader) gameModalHeader.innerHTML = '<h3><i class="fas fa-chart-bar"></i> Resultados del Juego</h3>';
    if (gameModal) gameModal.style.display = 'flex';
    
    showNotification('Resultados', 'Mostrando resultados del juego actual.');
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

// ===== SIMULACIÓN DE AUDIO (para desarrollo) =====
function simulateAudio() {
    // Solo para desarrollo - simula audio streaming
    console.log("🎧 Simulando audio de radio...");
    
    if (!window.radioState.audio) {
        window.radioState.audio = new Audio();
    }
    
    // Crear contexto de audio Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    
    oscillator.start();
    
    // Guardar referencia para detener
    window.radioState.simulatedAudio = { oscillator, gainNode, audioContext };
}

// ===== FUNCIÓN PARA QUE LOS OYENTES SE REGISTREN =====
window.showImListening = function() {
    // Incrementar contador de oyentes
    window.radioState.listeners += 1;
    
    // Agregar a lista de oyentes actuales
    const listenerId = 'user_' + Date.now();
    window.radioState.currentListeners.push({
        id: listenerId,
        joined: new Date().toISOString(),
        name: 'Oyente activo'
    });
    
    updateListenerDisplay();
    updateListenersAvatars();
    
    // Mostrar notificación
    showNotification('¡Gracias por escuchar!', 'Ahora apareces como oyente activo de la radio.');
    
    // Crear avatar especial para este oyente
    const listenersList = document.getElementById('listenersList');
    if (listenersList) {
        const newAvatar = document.createElement('div');
        newAvatar.className = 'listener-avatar new-listener';
        newAvatar.innerHTML = '<i class="fas fa-user-plus"></i>';
        newAvatar.style.background = 'var(--accent)';
        newAvatar.style.border = '3px solid white';
        newAvatar.style.boxShadow = '0 0 20px rgba(255, 107, 139, 0.7)';
        newAvatar.title = '¡Tú estás escuchando!';
        newAvatar.style.animation = 'pulse 2s infinite';
        
        listenersList.insertBefore(newAvatar, listenersList.firstChild);
        
        // Remover después de 10 segundos (o mantener si sigue escuchando)
        setTimeout(() => {
            if (newAvatar.parentNode && newAvatar.classList.contains('new-listener')) {
                newAvatar.style.opacity = '0';
                newAvatar.style.transform = 'scale(0.5)';
                setTimeout(() => {
                    if (newAvatar.parentNode) {
                        newAvatar.parentNode.removeChild(newAvatar);
                    }
                }, 500);
            }
        }, 10000);
    }
    
    // Guardar en localStorage
    saveListenersToStorage();
    
    return false;
};

// ===== NOTIFICACIONES =====
function showNotification(title, message) {
    // Usar el sistema de notificaciones existente si está disponible
    if (window.showNotification) {
        window.showNotification(`${title}: ${message}`, 'success');
        return;
    }
    
    // Sistema de notificaciones alternativo
    const notification = document.createElement('div');
    notification.className = 'radio-notification';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-info-circle"></i>
        </div>
        <div class="notification-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// ===== INICIALIZAR CUANDO EL DOCUMENTO ESTÉ LISTO =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRadio);
} else {
    initRadio();
}