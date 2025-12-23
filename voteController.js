const Vote = require('../models/Vote');
const Electeur = require('../models/Electeur');
const Candidat = require('../models/Candidat');

// Enregistrer un vote
exports.enregistrerVote = async (req, res) => {
  try {
    const electeurId = req.electeur._id;
    const sessionVote = new Date().getFullYear().toString();

    // Vérifier si l'électeur a déjà voté
    const voteExistant = await Vote.findOne({ electeur: electeurId, sessionVote });
    if (voteExistant) return res.status(400).json({ success: false, message: 'Vous avez déjà voté pour cette session' });

    const candidatsIds = Object.values(req.body).filter(Boolean);
    if (candidatsIds.length > 0) {
      const candidatsValides = await Candidat.find({ _id: { $in: candidatsIds }, statut: 'approuve', isActive: true });
      if (candidatsValides.length !== candidatsIds.length) return res.status(400).json({ success: false, message: 'Un ou plusieurs candidats sélectionnés sont invalides' });
    }

    const nouveauVote = await Vote.create({
      ...req.body,
      electeur: electeurId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionVote
    });

    // Mettre à jour le nombre de votes pour chaque candidat
    const updates = candidatsIds.map(id => Candidat.findByIdAndUpdate(id, { $inc: { nombreVotes: 1 } }));
    await Promise.all(updates);

    res.status(201).json({ success: true, message: 'Vote enregistré avec succès', data: { vote: { id: nouveauVote._id, timestamp: nouveauVote.timestamp, sessionVote } } });
  } catch (error) {
    console.error('Erreur enregistrement vote:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du vote' });
  }
};

// Résultats globaux
exports.getResultats = async (req, res) => {
  try {
    const { sessionVote } = req.query;
    const resultats = await Vote.getResultatsParPoste(sessionVote);
    const stats = await Vote.getStatsGenerales(sessionVote);

    const resultatsAvecDetails = {};
    for (const [poste, votes] of Object.entries(resultats)) {
      const candidatsIds = votes.map(v => v._id);
      const candidats = await Candidat.find({ _id: { $in: candidatsIds } }).select('nom postnom prenom photo poste bio');
      resultatsAvecDetails[poste] = votes.map(vote => ({
        candidat: candidats.find(c => c._id.toString() === vote._id.toString()) || { nom: 'Candidat inconnu' },
        votes: vote.votes
      }));
    }

    res.status(200).json({ success: true, data: { resultats: resultatsAvecDetails, stats } });
  } catch (error) {
    console.error('Erreur récupération résultats:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des résultats' });
  }
};

// Résultats par poste
exports.getResultatsParPoste = async (req, res) => {
  try {
    const { poste } = req.params;
    const { sessionVote } = req.query;

    const fieldMap = {
      president: 'candidatPresident',
      'vice-president': 'candidatVicePresident',
      secretaire: 'candidatSecretaire',
      tresorier: 'candidatTresorier',
      commissaire: 'candidatCommissaire',
      conseiller: 'candidatConseiller'
    };

    const fieldName = fieldMap[poste.toLowerCase()];
    if (!fieldName) return res.status(400).json({ success: false, message: 'Poste invalide' });

    const matchStage = { [fieldName]: { $ne: null } };
    if (sessionVote) matchStage.sessionVote = sessionVote;

    const resultats = await Vote.aggregate([
      { $match: matchStage },
      { $group: { _id: `$${fieldName}`, votes: { $sum: 1 } } },
      { $sort: { votes: -1 } }
    ]);

    const candidats = await Candidat.find({ _id: { $in: resultats.map(r => r._id) } }).select('nom postnom prenom photo poste bio');

    const totalVotes = resultats.reduce((sum, r) => sum + r.votes, 0);
    const resultatsAvecPourcentages = resultats.map(r => ({
      candidat: candidats.find(c => c._id.toString() === r._id.toString()) || { nom: 'Candidat inconnu' },
      votes: r.votes,
      pourcentage: totalVotes > 0 ? ((r.votes / totalVotes) * 100).toFixed(2) : 0
    }));

    res.status(200).json({ success: true, data: { poste, totalVotes, resultats: resultatsAvecPourcentages } });
  } catch (error) {
    console.error('Erreur récupération résultats par poste:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des résultats' });
  }
};

// Historique des votes (admin)
exports.getHistoriqueVotes = async (req, res) => {
  try {
    const { page = 1, limit = 20, sessionVote, dateDebut, dateFin } = req.query;
    const filter = {};

    if (sessionVote) filter.sessionVote = sessionVote;
    if (dateDebut || dateFin) filter.timestamp = { ...(dateDebut && { $gte: new Date(dateDebut) }), ...(dateFin && { $lte: new Date(dateFin) }) };

    const votes = await Vote.find(filter)
      .populate('electeur', 'nom postnom prenom matricule')
      .populate('candidatPresident candidatVicePresident candidatSecretaire candidatTresorier candidatCommissaire candidatConseiller', 'nom postnom prenom poste')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vote.countDocuments(filter);

    res.status(200).json({ success: true, data: { votes, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (error) {
    console.error('Erreur récupération historique votes:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique des votes' });
  }
};

// Vérifier si un électeur a déjà voté
exports.verifierStatutVote = async (req, res) => {
  try {
    const electeurId = req.electeur._id;
    const sessionVote = new Date().getFullYear().toString();
    const voteExistant = await Vote.findOne({ electeur: electeurId, sessionVote });

    res.status(200).json({ success: true, data: { aVote: !!voteExistant, dateVote: voteExistant?.timestamp || null } });
  } catch (error) {
    console.error('Erreur vérification statut vote:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification du statut de vote' });
  }
};

// Statistiques de participation
exports.getStatistiquesParticipation = async (req, res) => {
  try {
    const { sessionVote } = req.query;

    const statsElecteurs = await Electeur.getStats();
    const statsVotes = await Vote.getStatsGenerales(sessionVote);

    const statsParHeure = await Vote.aggregate([
      ...(sessionVote ? [{ $match: { sessionVote } }] : []),
      { $group: { _id: { $hour: '$timestamp' }, votes: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        participation: { totalElecteurs: statsElecteurs.totalElecteurs, totalVotes: statsVotes.totalVotes, tauxParticipation: statsElecteurs.tauxParticipation },
        distributionHoraires: statsParHeure,
        distributionJournaliere: statsVotes.distributionJournaliere
      }
    });
  } catch (error) {
    console.error('Erreur statistiques participation:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques de participation' });
  }
};