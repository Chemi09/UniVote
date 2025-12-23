const express = require('express');
const router = express.Router();
const electeurController = require('../controllers/electeurController');
const { protectElecteur, protectAdmin } = require('../middleware/auth');

/**
 * Routes accessibles par les électeurs
 */

// Récupérer le profil de l'électeur connecté
// GET /electeurs/profil
router.get('/profil', protectElecteur, electeurController.getProfil);

// Mettre à jour le profil de l'électeur connecté
// PUT /electeurs/profil
router.put('/profil', protectElecteur, electeurController.updateProfil);

/**
 * Routes accessibles par les administrateurs
 */

// Récupérer tous les électeurs
// GET /electeurs/
router.get('/', protectAdmin, electeurController.getAllElecteurs);

// Statistiques des électeurs
// GET /electeurs/stats
router.get('/stats', protectAdmin, electeurController.getStatsElecteurs);

// Désactiver un électeur
// PATCH /electeurs/:id/desactiver
router.patch('/:id/desactiver', protectAdmin, electeurController.desactiverElecteur);

module.exports = router;