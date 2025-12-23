const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateInscriptionElecteur } = require('../middleware/validation');

/**
 * Routes d'authentification
 */

// Inscription d'un électeur
// POST /auth/inscription
router.post('/inscription', validateInscriptionElecteur, authController.inscrireElecteur);

// Connexion des utilisateurs
// POST /auth/login-electeur
router.post('/login-electeur', authController.loginElecteur);

// POST /auth/login-candidat
router.post('/login-candidat', authController.loginCandidat);

// POST /auth/login-admin
router.post('/login-admin', authController.loginAdmin);

// Vérification du token JWT
// GET /auth/verify
router.get('/verify', authController.verifyToken);

// Déconnexion
// POST /auth/logout
router.post('/logout', authController.logout);

module.exports = router;