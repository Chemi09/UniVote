// REDIRECTIONS UNIVOTE

function goTo(page) {
    window.location.href = page + ".html";
}

// ADMIN
function loginAdmin() {
    // ... vérification admin ...
    goTo("admin");
}

// CANDIDAT
function loginCandidat() {
    // ... vérification candidat ...
    goTo("espace_candidat");
}

function openDepot() {
    goTo("depot_candidature");
}

// ELECTEUR
function loginElecteur() {
    // ... vérification électeur ...
    goTo("vote");
}

// RESULTATS
function goToResultats() {
    goTo("resultat");
}

// ACCUEIL
function goHome() {
    goTo("index");
}