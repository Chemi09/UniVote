const Electeur = require('../models/Electeur');
const Candidat = require('../models/Candidat');
const Vote = require('../models/Vote');
const Admin = require('../models/Admin');

const logAction = (admin, action, details = {}) => {
  console.log(`[${new Date().toISOString()}] Admin ${admin.username} => ${action}`, details);
};

// Tableau de bord
exports.getDashboard = async (req, res) => {
  try {
    const statsElecteurs = await Electeur.getStats();
    const statsVotes = await Vote.getStatsGenerales();
    const totalCandidats = await Candidat.countDocuments({ isActive: true });
    const candidatsApprouves = await Candidat.countDocuments({ statut: 'approuve', isActive: true });
    const derniersVotes = await Vote.find().populate('electeur', 'nom postnom prenom matricule').sort({ timestamp: -1 }).limit(5);
    const derniersElecteurs = await Electeur.find().sort({ dateInscription: -1 }).limit(5);
    const candidatsEnAttente = await Candidat.find({ statut: 'en_attente', isActive: true }).sort({ dateCandidature: -1 }).limit(5);
    const resultatsPreliminaires = await Vote.getResultatsParPoste();

    logAction(req.admin, 'dashboard_view');

    res.status(200).json({
      success: true,
      data: {
        stats: { electeurs: statsElecteurs, votes: statsVotes.totalVotes, candidats: totalCandidats, candidatsApprouves, tauxParticipation: statsElecteurs.tauxParticipation },
        activites: { derniersVotes, derniersElecteurs, candidatsEnAttente },
        resultatsPreliminaires
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du tableau de bord' });
  }
};

// Gestion du statut du vote
exports.gererStatutVote = async (req, res) => {
  try {
    const { action } = req.body;
    const voteOuvert = action === 'ouvrir';
    logAction(req.admin, `vote_${action}`);
    res.status(200).json({ success: true, message: voteOuvert ? 'Vote ouvert avec succès' : 'Vote fermé avec succès', data: { voteOuvert, actionPar: req.admin.username, timestamp: new Date().toISOString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la gestion du statut du vote' });
  }
};

// Réinitialiser les votes
exports.reinitialiserVotes = async (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'JE-CONFIRME-LA-REINITIALISATION') return res.status(400).json({ success: false, message: 'Confirmation requise' });

    await Vote.deleteMany({});
    await Candidat.updateMany({}, { $set: { nombreVotes: 0 } });
    await Electeur.updateMany({}, { $set: { hasVoted: false } });

    logAction(req.admin, 'reinitialiser_votes');

    res.status(200).json({ success: true, message: 'Tous les votes ont été réinitialisés', data: { votesSupprimes: true, timestamp: new Date().toISOString(), actionPar: req.admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation des votes' });
  }
};

// Export données JSON/CSV
exports.exporterDonnees = async (req, res) => {
  try {
    const { format = 'json', sessionVote } = req.query;
    const filter = sessionVote ? { sessionVote } : {};
    const donnees = {
      metadata: { exportDate: new Date().toISOString(), exportPar: req.admin.username, sessionVote: sessionVote || 'toutes', format },
      electeurs: await Electeur.find({ isActive: true }).select('-password'),
      candidats: await Candidat.find({ isActive: true }).select('-motDePasse'),
      votes: await Vote.find(filter).populate('electeur', 'nom postnom prenom matricule')
    };

    logAction(req.admin, 'export_donnees', { format });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=univote-export-${Date.now()}.csv`);
      return res.send(JSON.stringify(donnees)); // à remplacer par json2csv pour vrai CSV
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=univote-export-${Date.now()}.json`);
    res.send(JSON.stringify(donnees, null, 2));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'export des données' });
  }
};

// Création administrateur (seul super_admin)
exports.creerAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Seul un super administrateur peut créer d\'autres administrateurs' });
    const { username, password, email, nom, prenom, role, permissions } = req.body;

    const nouvelAdmin = await Admin.create({ username, password, email, nom, prenom, role: role || 'admin', permissions: permissions || { gererElecteurs: true, gererCandidats: true, gererVotes: true, voirStatistiques: true, exporterDonnees: true } });

    logAction(req.admin, 'creer_admin', { newAdmin: nouvelAdmin.username });

    res.status(201).json({ success: true, message: 'Administrateur créé avec succès', data: { admin: { id: nouvelAdmin._id, username: nouvelAdmin.username, email: nouvelAdmin.email, nom: nouvelAdmin.nom, prenom: nouvelAdmin.prenom, role: nouvelAdmin.role, permissions: nouvelAdmin.permissions, dateCreation: nouvelAdmin.dateCreation } } });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Nom d\'utilisateur ou email déjà existant' });
    res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'administrateur' });
  }
};