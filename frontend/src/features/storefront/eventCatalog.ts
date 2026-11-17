export type EventId = string
export type EventGroup = { name: string; items: string }
export type EventCollection = {
  id: EventId
  databaseId?: number
  number: string
  name: string
  slug?: string
  subtitle: string
  description: string
  imageUrl?: string | null
  groups?: EventGroup[]
  keywords?: string[]
  articles?: Array<{ id: number; nom: string }>
}

export const eventCollections: EventCollection[] = [
  {
    id: 'mariage', number: '01', name: 'Mariage', subtitle: 'Réception & cérémonie',
    description: 'Une réception élégante, des invités confortablement installés et une ambiance qui reste en mémoire.',
    groups: [
      { name: 'Structures & décoration', items: 'Arche de cérémonie, chapiteau, voilages, ciel étoilé' },
      { name: 'Mobilier', items: 'Chaises Chiavari, tables de banquet, mange-debout, salons lounge en rotin' },
      { name: 'Arts de la table', items: 'Porcelaine fine, verrerie élégante, couverts dorés, nappes, servantes' },
      { name: 'Éclairage & son', items: 'Guirlandes guinguette, éclairage architectural, audio pour discours et danse' },
    ],
    keywords: ['mariage', 'reception', 'structure', 'decoration', 'mobilier', 'table', 'chaise', 'arts de la table', 'vaisselle', 'eclairage', 'son', 'arche', 'chapiteau', 'tivoli', 'voilage', 'ciel etoile', 'chiavari', 'tresse', 'banquet', 'mange-debout', 'rotin', 'porcelaine', 'verrerie', 'couverts dores', 'nappes', 'servante', 'guinguette', 'eclairage architectural', 'discours'],
  },
  {
    id: 'conference', number: '02', name: 'Conférence', subtitle: 'Entreprise & séminaire',
    description: 'Des prises de parole nettes, une bonne visibilité et un aménagement professionnel pour vos équipes.',
    groups: [
      { name: 'Technique & audiovisuel', items: 'Écrans LED, vidéoprojecteurs, régie vidéo, micros sans fil, sonorisation' },
      { name: 'Mobilier', items: 'Chaises de conférence, pupitre design, tables de réunion, mange-debout' },
      { name: 'Signalétique & accueil', items: 'Cloisons modulaires, kakémonos, bornes d’accueil, pupitres d’émargement' },
    ],
    keywords: ['conference', 'seminaire', 'technique', 'audiovisuel', 'mobilier', 'signalétique', 'ecran led', 'videoprojecteur', 'projecteur', 'regie video', 'microphone', 'micro sans fil', 'sonorisation', 'chaise de conference', 'pupitre', 'table de reunion', 'cloison', 'kakemono', 'borne accueil', 'emargement'],
  },
  {
    id: 'gala', number: '03', name: 'Gala', subtitle: 'Soirée d’entreprise & networking',
    description: 'Un cadre festif et prestigieux pour réunir vos invités autour de la musique et de la restauration.',
    groups: [
      { name: 'Son, lumière & scène', items: 'Enceintes puissantes, projecteurs lyres, jeux de lumière, stroboscopes' },
      { name: 'Mobilier de réception', items: 'Bars lumineux, tables hautes, tabourets design, fauteuils lounge' },
      { name: 'Buffet & cocktail', items: 'Chafing dishes, fontaines à chocolat, présentoirs lumineux, vaisselle cocktail' },
    ],
    keywords: ['gala', 'networking', 'son', 'lumiere', 'scenographie', 'mobilier', 'reception', 'restauration', 'buffet', 'enceinte', 'barre de son', 'projecteur lyre', 'jeu de lumiere', 'stroboscope', 'bar lumineux', 'table haute', 'tabouret de bar', 'fauteuil lounge', 'chafing dish', 'fontaine chocolat', 'presentoir', 'cocktail'],
  },
  {
    id: 'fete-privee', number: '04', name: 'Fête privée', subtitle: 'Anniversaire & garden party',
    description: 'Une fête chaleureuse à la maison ou au jardin, avec tout le confort et l’ambiance qu’il faut.',
    groups: [
      { name: 'Aménagement extérieur', items: 'Tentes pliantes, tonnelles, parasols chauffants, brumisateurs' },
      { name: 'Loisirs & ambiance', items: 'Enceintes Bluetooth, micros karaoké, machines à fumée et à bulles' },
      { name: 'Mobilier & confort', items: 'Tables banquet pliantes, bancs en bois, chaises, bars d’appoint' },
    ],
    keywords: ['anniversaire', 'fete privee', 'garden party', 'exterieur', 'loisirs', 'ambiance', 'mobilier', 'tonnelle', 'tente pliante', 'parasols chauffants', 'brumisateur', 'bluetooth', 'karaoke', 'machine a fumee', 'machine a bulles', 'table pliante', 'banc en bois', 'bar appoint'],
  },
  {
    id: 'concert-festival', number: '05', name: 'Concert & festival', subtitle: 'Scène & plein air',
    description: 'Une installation résistante et du matériel technique adapté au spectacle vivant et au grand public.',
    groups: [
      { name: 'Scène & structures', items: 'Podiums modulaires, ponts lumière, tours de levage, barrières Vauban' },
      { name: 'Audio professionnel', items: 'Line array, retours de scène, consoles numériques, pieds de micro' },
      { name: 'Éclairage de scène', items: 'Projecteurs PAR LED, poursuites, machines à flammes, jets de CO₂' },
    ],
    keywords: ['concert', 'festival', 'scene', 'structure', 'audio', 'eclairage', 'plein air', 'sonorisation', 'podium', 'structure grill', 'pont eclairage', 'tour de levage', 'barriere vauban', 'line array', 'retour de scene', 'console de mixage', 'pied de micro', 'par led', 'poursuite', 'machine a flammes', 'co2'],
  },
]

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
