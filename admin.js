const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protectAdmin, restrictTo } = require('../middleware/auth');

// Toutes les routes admin nécessitent une protection
router.use(protectAdmin);

/**
 * Tableau de bord
 * GET /admin/dashboard
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * Gestion des votes
 * POST /admin/vote/statut         -> Mettre à jour ou gérer le statut des votes
 * POST /admin/vote/reinitialiser  -> Réinitialiser tous les votes (super_admin uniquement)
 */
router.post('/vote/statut', adminController.gererStatutVote);
router.post('/vote/reinitialiser', restrictTo('super_admin'), adminController.reinitialiserVotes);

/**
 * Export des données
 * GET /admin/export
 */
router.get('/export', adminController.exporterDonnees);

/**
 * Gestion des paramètres
 * PUT /admin/parametres
 */
router.put('/parametres', adminController.gererParametres);

/**
 * Logs système
 * GET /admin/logs
 */
router.get('/logs', adminController.getLogsSysteme);

/**
 * Gestion des administrateurs
 * POST /admin/admins
 * -> Créer un nouvel administrateur (réservé au super_admin)
 */
router.post('/admins', restrictTo('super_admin'), adminController.creerAdmin);

module.exports = router;