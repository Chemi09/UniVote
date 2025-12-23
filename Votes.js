const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { protectElecteur, protectAdmin } = require('../middleware/auth');
const { validateVote } = require('../middleware/validation');

/**
 * Routes accessibles par les électeurs
 */

// Enregistrer un vote
// POST /votes/
router.post('/', protectElecteur, validateVote, voteController.enregistrerVote);

// Vérifier si l'électeur a déjà voté
// GET /votes/statut
router.get('/statut', protectElecteur, voteController.verifierStatutVote);

/**
 * Routes publiques pour consulter les résultats
 */

// Résultats globaux
// GET /votes/resultats
router.get('/resultats', voteController.getResultats);

// Résultats détaillés par poste
// GET /votes/resultats/:poste
router.get('/resultats/:poste', voteController.getResultatsParPoste);

/**
 * Routes accessibles par les administrateurs
 */

// Historique des votes
// GET /votes/historique
router.get('/historique', protectAdmin, voteController.getHistoriqueVotes);

// Statistiques de participation
// GET /votes/statistiques/participation
router.get('/statistiques/participation', protectAdmin, voteController.getStatistiquesParticipation);

module.exports = router;