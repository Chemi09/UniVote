// Gestion des messages
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.querySelector('.main-container').prepend(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Mise à jour du statut global du vote
function updateVoteStatus() {
    const settings = db.getSettings();
    const statusElement = document.getElementById('globalVoteStatus');
    
    if (statusElement) {
        if (settings.voteOpen) {
            statusElement.textContent = '🟢 VOTE OUVERT';
            statusElement.className = 'vote-status status-open';
        } else {
            statusElement.textContent = '🔒 VOTE FERMÉ';
            statusElement.className = 'vote-status status-closed';
        }
    }
}

// Mise à jour des statistiques sur l'accueil
function updateHomeStats() {
    const stats = db.getStats();
    
    if (document.getElementById('homeTotalElecteurs')) {
        document.getElementById('homeTotalElecteurs').textContent = stats.totalElecteurs;
    }
    if (document.getElementById('homeTotalCandidats')) {
        document.getElementById('homeTotalCandidats').textContent = stats.totalCandidats;
    }
    if (document.getElementById('homeVoteRate')) {
        document.getElementById('homeVoteRate').textContent = stats.voteRate + '%';
    }
}

// Validation du matricule (format 12345.6.12345)
function validateMatricule(matricule) {
    return /^\d{5}\.\d{1}\.\d{5}$/.test(matricule);
}

// Nettoyage du texte pour éviter les caractères spéciaux
function cleanText(text) {
    return text.replace(/[^a-zA-Z0-9À-ÿ\s.'-]/g, '').trim();
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    updateVoteStatus();
    updateHomeStats();
});