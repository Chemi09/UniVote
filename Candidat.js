const express = require('express');
const router = express.Router();
const candidatController = require('../controllers/candidatController');
const { protectAdmin, protectCandidat } = require('../middleware/auth');
const { validateCandidature } = require('../middleware/validation');

/**
 * Routes publiques
 */

// Récupérer tous les candidats
// GET /candidats/
router.get('/', candidatController.getAllCandidats);

// Récupérer les candidats par poste
// GET /candidats/poste/:poste
router.get('/poste/:poste', candidatController.getCandidatsParPoste);

/**
 * Routes pour les candidats
 */

// Déposer une candidature
// POST /candidats/candidature
router.post('/candidature', validateCandidature, candidatController.deposerCandidature);

/**
 * Routes réservées aux administrateurs
 */

// Statistiques des candidats
// GET /candidats/stats
router.get('/stats', protectAdmin, candidatController.getStatsCandidats);

// Approuver un candidat
// PATCH /candidats/:id/approuver
router.patch('/:id/approuver', protectAdmin, candidatController.approuverCandidat);

// Rejeter un candidat
// PATCH /candidats/:id/rejeter
router.patch('/:id/rejeter', protectAdmin, candidatController.rejeterCandidat);

module.exports = router;