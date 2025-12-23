const Candidat = require('../models/Candidat');
const multer = require('multer');
const path = require('path');

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/candidats/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `candidat-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  }
}).single('photo');

// Déposer candidature
exports.deposerCandidature = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    try {
      const { nom, postnom, prenom, matricule, poste, bio, programme } = req.body;

      const numCandidat = await Candidat.genererNumCandidat();
      const motDePasse = Candidat.genererMotDePasse();

      const candidatData = { nom, postnom, prenom, matricule, numCandidat, motDePasse, poste, bio, programme };
      if (req.file) candidatData.photo = `/uploads/candidats/${req.file.filename}`;

      const nouveauCandidat = await Candidat.create(candidatData);

      res.status(201).json({ success: true, message: 'Candidature déposée avec succès', data: { candidat: nouveauCandidat } });
    } catch (error) {
      if (error.code === 11000) return res.status(400).json({ success: false, message: 'Ce matricule est déjà candidat' });
      console.error('Erreur dépôt candidature:', error);
      res.status(500).json({ success: false, message: 'Erreur lors du dépôt de candidature' });
    }
  });
};

// Liste candidats avec pagination et filtre
exports.getAllCandidats = async (req, res) => {
  try {
    const { page = 1, limit = 10, poste, statut, search } = req.query;
    const filter = { isActive: true };

    if (poste) filter.poste = poste;
    if (statut) filter.statut = statut;
    if (search) filter.$or = ['nom','postnom','prenom','matricule','numCandidat'].map(f => ({ [f]: { $regex: search, $options: 'i' } }));

    const candidats = await Candidat.find(filter).select('-motDePasse').sort({ dateCandidature: -1 })
      .limit(Number(limit)).skip((Number(page)-1)*Number(limit));
    const total = await Candidat.countDocuments(filter);

    res.status(200).json({ success: true, data: { candidats, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total/limit) } } });
  } catch (error) {
    console.error('Erreur récupération candidats:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des candidats' });
  }
};

// Candidats par poste
exports.getCandidatsParPoste = async (req, res) => {
  try {
    const { poste } = req.params;
    const candidats = await Candidat.find({ poste, statut: 'approuve', isActive: true }).select('-motDePasse');
    res.status(200).json({ success: true, data: { candidats } });
  } catch (error) {
    console.error('Erreur récupération candidats par poste:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des candidats' });
  }
};

// Approbation / rejet candidat
const updateStatutCandidat = async (id, action, raison = '') => {
  const candidat = await Candidat.findById(id);
  if (!candidat) throw new Error('Candidat non trouvé');
  if (action === 'approuver') await candidat.approuver();
  else if (action === 'rejeter') await candidat.rejeter();
  return candidat;
};

exports.approuverCandidat = async (req, res) => {
  try {
    const candidat = await updateStatutCandidat(req.params.id, 'approuver');
    res.status(200).json({ success: true, message: 'Candidat approuvé avec succès', data: { candidat } });
  } catch (error) {
    console.error('Erreur approbation candidat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejeterCandidat = async (req, res) => {
  try {
    const candidat = await updateStatutCandidat(req.params.id, 'rejeter', req.body.raison);
    res.status(200).json({ success: true, message: `Candidat rejeté${req.body.raison ? `: ${req.body.raison}` : ''}`, data: { candidat } });
  } catch (error) {
    console.error('Erreur rejet candidat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Statistiques candidats
exports.getStatsCandidats = async (req, res) => {
  try {
    const stats = await Candidat.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$poste', total: { $sum: 1 },
        approuves: { $sum: { $cond: [{ $eq: ['$statut', 'approuve'] }, 1, 0] } },
        enAttente: { $sum: { $cond: [{ $eq: ['$statut', 'en_attente'] }, 1, 0] } },
        rejetes: { $sum: { $cond: [{ $eq: ['$statut', 'rejete'] }, 1, 0] } } } },
      { $project: { poste: '$_id', total: 1, approuves: 1, enAttente: 1, rejetes: 1 } },
      { $sort: { poste: 1 } }
    ]);
    const totalGeneral = await Candidat.countDocuments({ isActive: true });
    const totalApprouves = await Candidat.countDocuments({ statut: 'approuve', isActive: true });

    res.status(200).json({ success: true, data: { totalGeneral, totalApprouves, parPoste: stats } });
  } catch (error) {
    console.error('Erreur statistiques candidats:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
};