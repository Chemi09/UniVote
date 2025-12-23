const Electeur = require('../models/Electeur');
const Candidat = require('../models/Candidat');
const Admin = require('../models/Admin');
const { signToken } = require('../middleware/auth');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

// Helper pour login
const handleLogin = async (user, passwordField, password, type) => {
  if (!user || !(await user.correctPassword(password, user[passwordField]))) return false;
  if (!user.isActive) throw new Error(`${type} inactif`);
  return user;
};

// Connexion électeur
exports.loginElecteur = async (req, res) => {
  try {
    const { matricule, password } = req.body;
    if (!matricule || !password) return res.status(400).json({ success: false, message: 'Matricule et mot de passe requis' });

    const electeur = await Electeur.findOne({ matricule }).select('+password');
    await handleLogin(electeur, 'password', password, 'Électeur');

    electeur.lastLogin = new Date();
    await electeur.save();

    const token = signToken(electeur._id, 'electeur');
    res.status(200).json({ success: true, message: 'Connexion réussie', token, data: { electeur } });
  } catch (err) {
    console.error('Erreur login électeur:', err.message);
    res.status(401).json({ success: false, message: err.message || 'Connexion échouée' });
  }
};

// Connexion candidat
exports.loginCandidat = async (req, res) => {
  try {
    const { numCandidat, motDePasse } = req.body;
    if (!numCandidat || !motDePasse) return res.status(400).json({ success: false, message: 'Numéro de candidature et mot de passe requis' });

    const candidat = await Candidat.findOne({ numCandidat }).select('+motDePasse');
    if (!candidat || candidat.motDePasse !== motDePasse) throw new Error('Numéro de candidature ou mot de passe incorrect');
    if (!candidat.isActive) throw new Error('Candidature désactivée');
    if (candidat.statut !== 'approuve') throw new Error('Candidature non approuvée');

    const token = signToken(candidat._id, 'candidat');
    res.status(200).json({ success: true, message: 'Connexion réussie', token, data: { candidat } });
  } catch (err) {
    console.error('Erreur login candidat:', err.message);
    res.status(401).json({ success: false, message: err.message });
  }
};

// Connexion admin
exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Nom d\'utilisateur et mot de passe requis' });

    const admin = await Admin.findOne({ username }).select('+password');
    await handleLogin(admin, 'password', password, 'Administrateur');

    await admin.updateLastLogin();
    const token = signToken(admin._id, 'admin');

    res.status(200).json({ success: true, message: 'Connexion réussie', token, data: { admin } });
  } catch (err) {
    console.error('Erreur login admin:', err.message);
    res.status(401).json({ success: false, message: err.message });
  }
};

// Vérifier token
exports.verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) throw new Error('Token non fourni');

    const token = authHeader.split(' ')[1];
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    let user;
    switch (decoded.type) {
      case 'electeur': user = await Electeur.findById(decoded.id); break;
      case 'candidat': user = await Candidat.findById(decoded.id); break;
      case 'admin': user = await Admin.findById(decoded.id); break;
      default: throw new Error('Type d\'utilisateur invalide');
    }

    if (!user) throw new Error('Utilisateur non trouvé');

    res.status(200).json({ success: true, message: 'Token valide', data: { user, type: decoded.type } });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message || 'Token invalide' });
  }
};

// Déconnexion (côté client)
exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Déconnexion réussie' });
};