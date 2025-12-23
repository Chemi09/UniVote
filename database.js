// Base de données avec localStorage
class UnivoteDB {
    constructor() {
        this.initDB();
    }

    initDB() {
        const defaults = {
            candidats: [],
            votes: [],
            electeurs: [],
            settings: { 
                voteOpen: false,
                lastReset: new Date().toISOString()
            }
        };

        Object.keys(defaults).forEach(key => {
            if (!localStorage.getItem(`univote_${key}`)) {
                localStorage.setItem(`univote_${key}`, JSON.stringify(defaults[key]));
            }
        });
    }

    // Gestion des électeurs
    addElecteur(electeur) {
        const electeurs = this.getElecteurs();
        
        // Vérifier si le matricule existe déjà
        if (electeurs.find(e => e.matricule === electeur.matricule)) {
            throw new Error('Ce matricule est déjà inscrit');
        }

        electeur.id = Date.now();
        electeur.dateInscription = new Date().toISOString();
        electeurs.push(electeur);
        localStorage.setItem('univote_electeurs', JSON.stringify(electeurs));
        return electeur;
    }

    getElecteurs() {
        return JSON.parse(localStorage.getItem('univote_electeurs'));
    }

    // Gestion des votes
    addVote(vote) {
        const votes = this.getVotes();
        
        // Vérifier si l'électeur a déjà voté
        if (votes.find(v => v.electeurId === vote.electeurId)) {
            throw new Error('Cet électeur a déjà voté');
        }

        vote.id = Date.now();
        vote.timestamp = new Date().toISOString();
        votes.push(vote);
        localStorage.setItem('univote_votes', JSON.stringify(votes));
        return vote;
    }

    getVotes() {
        return JSON.parse(localStorage.getItem('univote_votes'));
    }

    // Gestion des candidats
    addCandidat(candidat) {
        const candidats = this.getCandidats();
        
        // Vérifier si le matricule existe déjà
        if (candidats.find(c => c.matricule === candidat.matricule)) {
            throw new Error('Ce matricule est déjà candidat');
        }

        candidat.id = Date.now();
        candidat.numCandidat = 'C' + Math.floor(1000 + Math.random() * 9000);
        candidat.motDePasse = Math.random().toString(36).slice(-8);
        candidat.dateCandidature = new Date().toISOString();
        candidats.push(candidat);
        localStorage.setItem('univote_candidats', JSON.stringify(candidats));
        return candidat;
    }

    getCandidats() {
        return JSON.parse(localStorage.getItem('univote_candidats'));
    }

    // Paramètres
    getSettings() {
        return JSON.parse(localStorage.getItem('univote_settings'));
    }

    updateSettings(settings) {
        localStorage.setItem('univote_settings', JSON.stringify(settings));
    }

    // Statistiques
    getStats() {
        const electeurs = this.getElecteurs();
        const candidats = this.getCandidats();
        const votes = this.getVotes();
        const settings = this.getSettings();

        return {
            totalElecteurs: electeurs.length,
            totalCandidats: candidats.length,
            totalVotes: votes.length,
            voteRate: electeurs.length > 0 ? Math.round((votes.length / electeurs.length) * 100) : 0,
            voteOpen: settings.voteOpen
        };
    }
}

// Initialisation globale
const db = new UnivoteDB();