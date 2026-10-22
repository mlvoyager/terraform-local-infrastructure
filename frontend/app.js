
const status = document.getElementById("status");
const form = document.getElementById("message-form");
const messageInput = document.getElementById("message");
const feedback = document.getElementById("feedback");
const messagesList = document.getElementById("messages");
const refreshButton = document.getElementById("refresh");

// Vérifier la connexion au backend
async function checkBackend() {
    try {
        const response = await fetch("/api/");

        if (!response.ok) {
            throw new Error("Backend indisponible");
        }

        const data = await response.json();
        status.textContent = data.message;
    } catch (error) {
        status.textContent = "Impossible de contacter le backend.";
    }
}

// Charger les messages depuis PostgreSQL
async function loadMessages() {
    try {
        const response = await fetch("/api/data");

        if (!response.ok) {
            throw new Error("Erreur lors du chargement");
        }

        const messages = await response.json();
        messagesList.replaceChildren();

        messages.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item.message;
            messagesList.appendChild(li);
        });
    } catch (error) {
        feedback.textContent = "Impossible de charger les messages.";
    }
}

// Enregistrer un nouveau message
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) return;

    try {
        const response = await fetch("/api/data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error("Erreur lors de l'enregistrement");
        }

        messageInput.value = "";
        feedback.textContent = "Message enregistré avec succès !";

        await loadMessages();
    } catch (error) {
        feedback.textContent = "Échec de l'enregistrement du message.";
    }
});

// Actualiser la liste
refreshButton.addEventListener("click", loadMessages);

// Lancer les vérifications au chargement de la page
checkBackend();
loadMessages();
