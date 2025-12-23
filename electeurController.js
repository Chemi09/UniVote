const Electeur = require('../models/Electeur');
const { signToken } = require('../middleware/auth');

// Inscription électeur
exports.inscrireElecteur = async (req, res) => {
  try {
    const { nom, postnom, prenom, matricule, password, email, telephone, faculte, promotion } = req.body;

    const nouvelElecteur = await Electeur.create({ nom, postnom, prenom, matricule, password, email, telephone, faculte, promotion });
    const token = signToken(nouvelElecteur._id, 'electeur');

    res.status(201).json({ success: true, message: 'Inscription réussie', token, data: { electeur: nouvelElecteur } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Ce matricule est déjà inscrit' });
    console.error('Erreur inscription électeur:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'inscription' });
  }
};

// Profil électeur
exports.getProfil = async (req, res) => {
  try {
    const electeur = await Electeur.findById(req.electeur._id);
    res.status(200).json({ success: true, data: { electeur } });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du profil' });
  }
};

// Mise à jour profil
exports.updateProfil = async (req, res) => {
  try {
    const { email, telephone, faculte, promotion } = req.body;
    const electeur = await Electeur.findByIdAndUpdate(req.electeur._id, { email, telephone, faculte, promotion }, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profil mis à jour avec succès', data: { electeur } });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du profil' });
  }
};

// Liste électeurs (admin)
exports.getAllElecteurs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, hasVoted, faculte } = req.query;
    const filter = { isActive: true };

    if (search) filter.$or = ['nom','postnom','prenom','matricule'].map(f => ({ [f]: { $regex: search, $options: 'i' } }));
    if (hasVoted !== undefined) filter.hasVoted = hasVoted === 'true';
    if (faculte) filter.faculte = { $regex: faculte, $options: 'i' };

    const electeurs = await Electeur.find(filter).select('-password').sort({ dateInscription: -1 })
      .limit(Number(limit)).skip((Number(page)-1)*Number(limit));
    const total = await Electeur.countDocuments(filter);

    res.status(200).json({ success: true, data: { electeurs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total/limit) } } });
  } catch (error) {
    console.error('Erreur récupération électeurs:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des électeurs' });
  }
};

// Statistiques électeurs
exports.getStatsElecteurs = async (req, res) => {
  try {
    const stats = await Electeur.getStats();

    const statsFaculte = await Electeur.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$faculte', total: { $sum: 1 }, aVote: { $sum: { $cond: [{ $eq: ['$hasVoted', true] }, 1, 0] } } } },
      { $project: { faculte: '$_id', total: 1, aVote: 1, tauxParticipation: { $cond: [{ $eq: ['$total',0] }, 0, { $multiply: [{ $divide: ['$aVote','$total'] },100] }] } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({ success: true, data: { ...stats, parFaculte: statsFaculte } });
  } catch (error) {
    console.error('Erreur statistiques électeurs:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
};

// Désactiver électeur
exports.desactiverElecteur = async (req, res) => {
  try {
    const electeur = await Electeur.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!electeur) return res.status(404).json({ success: false, message: 'Électeur non trouvé' });
    res.status(200).json({ success: true, message: 'Électeur désactivé avec succès', data: { electeur } });
  } catch (error) {
    console.error('Erreur désactivation électeur:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la désactivation de l\'électeur' });
  }
};