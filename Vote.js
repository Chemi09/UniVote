const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  electeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Electeur',
    required: [true, "L'électeur est obligatoire"],
    index: true
  },
  candidatPresident: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidat' },
  candidatVicePresident: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidat' },
  candidatSecretaire: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidat' },
  candidatTresorier: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidat' },
  candidatCommissaire: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidat' },
  candidatConseiller: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidat' },
  sessionVote: {
    type: String,
    default: () => new Date().getFullYear().toString()
  },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  isValid: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Index composé pour éviter les votes multiples par électeur et par session
voteSchema.index({ electeur: 1, sessionVote: 1 }, { unique: true });

// Index pour les requêtes fréquentes
voteSchema.index({ sessionVote: 1 });
voteSchema.index({ timestamp: 1 });

// Middleware post-save pour mettre à jour le statut de l'électeur
voteSchema.post('save', async function() {
  const Electeur = mongoose.model('Electeur');
  await Electeur.findByIdAndUpdate(this.electeur, { hasVoted: true });
});

// Méthode statique pour obtenir les résultats par poste
voteSchema.statics.getResultatsParPoste = async function(sessionVote = null) {
  const matchStage = sessionVote ? { sessionVote } : {};

  const resultats = await this.aggregate([
    { $match: matchStage },
    {
      $project: {
        president: '$candidatPresident',
        vicePresident: '$candidatVicePresident',
        secretaire: '$candidatSecretaire',
        tresorier: '$candidatTresorier',
        commissaire: '$candidatCommissaire',
        conseiller: '$candidatConseiller'
      }
    },
    {
      $facet: {
        president: [
          { $match: { president: { $ne: null } } },
          { $group: { _id: '$president', votes: { $sum: 1 } } },
          { $sort: { votes: -1 } }
        ],
        vicePresident: [
          { $match: { vicePresident: { $ne: null } } },
          { $group: { _id: '$vicePresident', votes: { $sum: 1 } } },
          { $sort: { votes: -1 } }
        ],
        secretaire: [
          { $match: { secretaire: { $ne: null } } },
          { $group: { _id: '$secretaire', votes: { $sum: 1 } } },
          { $sort: { votes: -1 } }
        ],
        tresorier: [
          { $match: { tresorier: { $ne: null } } },
          { $group: { _id: '$tresorier', votes: { $sum: 1 } } },
          { $sort: { votes: -1 } }
        ],
        commissaire: [
          { $match: { commissaire: { $ne: null } } },
          { $group: { _id: '$commissaire', votes: { $sum: 1 } } },
          { $sort: { votes: -1 } }
        ],
        conseiller: [
          { $match: { conseiller: { $ne: null } } },
          { $group: { _id: '$conseiller', votes: { $sum: 1 } } },
          { $sort: { votes: -1 } }
        ]
      }
    }
  ]);

  return resultats[0];
};

// Méthode statique pour obtenir les statistiques générales
voteSchema.statics.getStatsGenerales = async function(sessionVote = null) {
  const matchStage = sessionVote ? { sessionVote } : {};

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalVotes: { $sum: 1 },
        votesParJour: {
          $push: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: 1
          }
        }
      }
    },
    {
      $project: {
        totalVotes: 1,
        distributionJournaliere: {
          $reduce: {
            input: '$votesParJour',
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                [
                  {
                    $cond: [
                      { $in: ['$$this.date', '$$value.date'] },
                      {
                        $mergeObjects: [
                          '$$this',
                          {
                            count: {
                              $add: [
                                '$$this.count',
                                { $arrayElemAt: ['$$value.count', { $indexOfArray: ['$$value.date', '$$this.date'] }] }
                              ]
                            }
                          }
                        ]
                      },
                      '$$this'
                    ]
                  }
                ]
              ]
            }
          }
        }
      }
    }
  ]);

  return stats[0] || { totalVotes: 0, distributionJournaliere: [] };
};

module.exports = mongoose.model('Vote', voteSchema);