const { body, validationResult } = require('express-validator');
const Electeur = require('../models/Electeur');
const Candidat = require('../models/Candidat');

/**
 * Middleware générique pour gérer les erreurs de validation
 */
const handleValidationErrors = (errorMessage) => (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errorMessage,
      errors: errors.array()
    });
  }
  next();
};

// Validation pour l'inscription d'un électeur
exports.validateInscriptionElecteur = [
  body('nom')
    .notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ max: 50 }).withMessage('Le nom ne peut pas dépasser 50 caractères')
    .trim().escape(),

  body('postnom')
    .notEmpty().withMessage('Le postnom est obligatoire')
    .isLength({ max: 50 }).withMessage('Le postnom ne peut pas dépasser 50 caractères')
    .trim().escape(),

  body('prenom')
    .notEmpty().withMessage('Le prénom est obligatoire')
    .isLength({ max: 50 }).withMessage('Le prénom ne peut pas dépasser 50 caractères')
    .trim().escape(),

  body('matricule')
    .notEmpty().withMessage('Le matricule est obligatoire')
    .matches(/^\d{5}\.\d{1}\.\d{5}$/).withMessage('Format de matricule invalide. Exemple: 12345.6.12345')
    .custom(async (value) => {
      const exists = await Electeur.findOne({ matricule: value });
      if (exists) throw new Error('Ce matricule est déjà inscrit');
    }),

  body('password')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),

  handleValidationErrors('Données invalides')
];

// Validation pour la candidature
exports.validateCandidature = [
  body('nom').notEmpty().withMessage('Le nom est obligatoire').trim().escape(),
  body('postnom').notEmpty().withMessage('Le postnom est obligatoire').trim().escape(),
  body('prenom').notEmpty().withMessage('Le prénom est obligatoire').trim().escape(),

  body('matricule')
    .notEmpty().withMessage('Le matricule est obligatoire')
    .matches(/^\d{5}\.\d{1}\.\d{5}$/).withMessage('Format de matricule invalide')
    .custom(async (value) => {
      const exists = await Candidat.findOne({ matricule: value });
      if (exists) throw new Error('Ce matricule est déjà candidat');
    }),

  body('poste')
    .notEmpty().withMessage('Le poste est obligatoire')
    .isIn(['Président', 'Vice-président', 'Secrétaire général', 'Trésorier', 'Commissaire aux comptes', 'Conseiller'])
    .withMessage('Poste invalide'),

  body('bio')
    .notEmpty().withMessage('La biographie est obligatoire')
    .isLength({ max: 500 }).withMessage('La biographie ne peut pas dépasser 500 caractères')
    .trim().escape(),

  handleValidationErrors('Données de candidature invalides')
];

// Validation pour le vote
exports.validateVote = [
  ...['President', 'VicePresident', 'Secretaire', 'Tresorier', 'Commissaire', 'Conseiller'].map((poste) =>
    body(`candidat${poste}`)
      .optional()
      .isMongoId()
      .withMessage(`ID de candidat ${poste.toLowerCase()} invalide`)
  ),
  handleValidationErrors('Données de vote invalides')
];