import { createI18n } from 'vue-i18n'

const error_translations = {
  en: {
    ALREADY_ONLINE:
      'It seems you are already connected to the server, please wait a few seconds and try again',
    EARLY_ACCESS_KEY_REQUIRED:
      'You need an early access key to play on AresRPG',
    MAX_PLAYERS: `Sorry sir, the server is full and we don't yet have the capacity to handle that much players, please try again later`,
    SIGNATURE_TIMEOUT: 'Please sign the message faster!',
    INVALID_SIGNATURE: 'Invalid signature',
    NO_REASON: 'The server appears to be down, please try again later',
    MOVE_FIRST:
      'Please move before doing this action, the server must acknowledge your existence first',
    CHARACTER_UNLOCKED: 'Did you unlock your character ?',
    INVALID_CONTRACT:
      'The contract is invalid, is your app up to date ? Try to refresh the page',
    MAX_CHARACTERS_PER_PLAYER: `You can't play with that many characters!`,
  },
  fr: {
    ALREADY_ONLINE:
      'Il semblerait que vous soyez déjà connecté au serveur, veuillez patienter quelques secondes et réessayer',
    EARLY_ACCESS_KEY_REQUIRED:
      "Vous avez besoin d'une clé beta pour jouer sur AresRPG",
    MAX_PLAYERS: `Désolé Sir, le serveur est plein et nous n'avons pas encore la capacité de gérer autant de joueurs, veuillez réessayer plus tard`,
    SIGNATURE_TIMEOUT: 'Veuillez signer le message plus rapidement!',
    INVALID_SIGNATURE: 'Signature invalide',
    NO_REASON:
      'Le serveur semble être hors ligne, veuillez réessayer plus tard',
    MOVE_FIRST: `Veuillez bouger avant de faire cette action, le serveur doit d'abord reconnaître votre existence`,
    CHARACTER_UNLOCKED: 'Avez-vous débloqué votre personnage ?',
    INVALID_CONTRACT:
      'Le contrat est invalide, votre application est-elle à jour ? Essayez de rafraîchir la page',
    MAX_CHARACTERS_PER_PLAYER: `Vous ne pouvez pas jouer avec autant de personnages !`,
  },
}

const error_sui = {
  en: {
    LOGIN_AGAIN: 'Please login again',
    WALLET_NOT_FOUND: 'Wallet not found',
    PLEASE_SWITCH_NETWORK: 'Please switch to the Sui',
    ENOKI_SALT:
      'Enoki failed to deliver the transaction (salt failure). Please try again.',
    OUTDATED: `The app is outdated and can't use this feature. Please update the app.`,
    NO_GAS: 'You need Sui in your wallet to perform this action',
    NOT_ENOUGH_FOOD: `You do not have enough food!`,
    WALLET_CONFIG: 'Wallet configuration error',
    SUI_SUBSCRIBE_OK: 'Connected to Sui',
    E_PET_ALREADY_FED: 'This pet is not hungry',
    INV_NOT_EMPTY: 'You must unequip all items before that',
    SUBSCRIBE_ERROR:
      'The Sui node refused the subscription, please refresh the page to try again',
    FAILURE: 'Блять! This transaction failed, please try again',
    NO_PERSONAL_KIOSK: 'This action requires to create a character first',
    SUBSCRIBE_START: 'Subscribing to Sui node...',
    FETCHING_DATA: 'Fetching characters and items..',
    DATA_FETCHED: 'Successfully fetched characters and items',
    WAIT_A_MINUTE: 'Please wait before trying again',
    ENOKI_DOWN:
      'The sponsoring service seems to be malfunctioning, please try again later.',
  },
  fr: {
    LOGIN_AGAIN: 'Veuillez vous reconnecter',
    WALLET_NOT_FOUND: 'Portefeuille introuvable',
    PLEASE_SWITCH_NETWORK: 'Veuillez passer sur le Sui',
    ENOKI_SALT:
      "Enoki n'a pas pu livrer la transaction (échec du salt). Veuillez réessayer.",
    OUTDATED: `L'application est obsolète et ne peut pas utiliser cette fonctionnalité. Veuillez mettre à jour l'application.`,
    NO_GAS:
      'Vous avez besoin de Sui dans votre portefeuille pour effectuer cette action',
    NOT_ENOUGH_FOOD: `Vous n'avez pas assez de nourriture!`,
    WALLET_CONFIG: 'Erreur de configuration du portefeuille',
    SUI_SUBSCRIBE_OK: 'Connecté à Sui',
    E_PET_ALREADY_FED: 'Ce famillier n a pas faim',
    INV_NOT_EMPTY: `Vous devez déséquiper tous les objets d'abord`,
    SUBSCRIBE_ERROR: `La node Sui a refusé la connection, veuillez rafraîchir la page pour réessayer`,
    FAILURE: 'Блять! Cette transaction a échoué, veuillez réessayer',
    NO_PERSONAL_KIOSK: `Cette action nécessite de créer un personnage d'abord`,
    SUBSCRIBE_START: 'Connexion à la node Sui...',
    FETCHING_DATA: 'Récupération des personnages et objets..',
    DATA_FETCHED: 'Personnages et objets récupérés avec succès',
    WAIT_A_MINUTE: 'Veuillez attendre avant de réessayer',
    ENOKI_DOWN:
      'Le service de sponsoring semble dysfonctionner, veuillez réessayer plus tard.',
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  allowComposition: true, // you need to specify that!
  messages: {
    fr: {
      ...error_translations.fr,
      ...error_sui.fr,
      item_sold: 'a été vendu',
      sign_message:
        '[AresRPG] Ceci est un message de vérification pour prouver que vous possédez cette adresse. Il vous permettra de vous connecter au serveur',
    },
    en: {
      ...error_translations.en,
      ...error_sui.en,
      item_sold: 'was sold',
      sign_message:
        '[AresRPG] This is a verification message to prove that you own this address. It will allow you to connect to the server',
    },
  },
})
