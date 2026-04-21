// ========== IMPORTS ==========
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc,
    deleteDoc,
    doc, 
    getDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ========== AUTH MANAGER ==========
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    init() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            this.isAdmin = false;

            if (user) {
                // Vérifie si l'utilisateur est admin dans Firestore
                try {
                    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                    this.isAdmin = adminDoc.exists() && adminDoc.data().isAdmin === true;
                } catch (e) {
                    this.isAdmin = false;
                }
            }

            this.updateUI();
            // Re-render les suggestions pour afficher/cacher les boutons admin
            if (window.suggestionsManager) {
                suggestionsManager.renderSuggestions();
            }
        });
    }

    async signup(name, email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async login(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getErrorMessage(code) {
        switch (code) {
            case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
            case 'auth/weak-password': return 'Le mot de passe doit contenir au moins 6 caractères.';
            case 'auth/invalid-email': return 'Email invalide.';
            case 'auth/user-not-found': return 'Aucun compte trouvé avec cet email.';
            case 'auth/wrong-password': return 'Mot de passe incorrect.';
            default: return 'Une erreur est survenue.';
        }
    }

    updateUI() {
        const authLink = document.getElementById('auth-link');
        if (this.currentUser) {
            const displayName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
            const avatarLetter = displayName.charAt(0).toUpperCase();
            const adminBadge = this.isAdmin ? '<span class="admin-badge">⚙️ Admin</span>' : '';
            authLink.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${avatarLetter}</div>
                    <span>${displayName}</span>
                    ${adminBadge}
                    <button class="logout-btn" onclick="authManager.logout()">Déconnexion</button>
                </div>
            `;
        } else {
            authLink.innerHTML = '<a href="#" onclick="showAuthModal()">Se connecter</a>';
        }
    }
}

// ========== SUGGESTIONS MANAGER ==========
class SuggestionsManager {
    constructor() {
        this.suggestionsRef = collection(db, 'suggestions');
        this.suggestions = [];
        this.init();
    }

    async init() {
        this.setupFormListener();
        this.listenToSuggestions();
    }

    async listenToSuggestions() {
        const q = query(this.suggestionsRef, orderBy('createdAt', 'desc'));
        onSnapshot(q, (snapshot) => {
            this.suggestions = [];
            snapshot.forEach((doc) => {
                this.suggestions.push({ firebaseId: doc.id, ...doc.data() });
            });
            this.renderSuggestions();
        });
    }

    setupFormListener() {
        const form = document.querySelector('.suggestion-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addSuggestion();
            });
        }
    }

    async addSuggestion() {
        if (!authManager.currentUser) {
            alert('Vous devez être connecté pour poster une suggestion.');
            showAuthModal();
            return;
        }

        const title = document.getElementById('suggestionTitle').value.trim();
        const text = document.getElementById('suggestionText').value.trim();
        if (!title || !text) return;

        try {
            await addDoc(this.suggestionsRef, {
                author: authManager.currentUser.displayName || authManager.currentUser.email.split('@')[0],
                authorId: authManager.currentUser.uid,
                title, text,
                likes: [],
                comments: [],
                createdAt: serverTimestamp()
            });
            document.querySelector('.suggestion-form').reset();
            alert('Merci pour ta suggestion ! 🎉');
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'envoi');
        }
    }

    async deleteSuggestion(firebaseId) {
        if (!authManager.isAdmin) return;
        if (!confirm('Supprimer cette suggestion ?')) return;
        try {
            await deleteDoc(doc(db, 'suggestions', firebaseId));
        } catch (error) {
            console.error('Erreur suppression:', error);
            alert('Erreur lors de la suppression.');
        }
    }

    async deleteComment(firebaseId, commentIndex) {
        if (!authManager.isAdmin) return;
        if (!confirm('Supprimer ce commentaire ?')) return;
        try {
            const suggestion = this.suggestions.find(s => s.firebaseId === firebaseId);
            if (suggestion) {
                const comments = [...(suggestion.comments || [])];
                comments.splice(commentIndex, 1);
                await updateDoc(doc(db, 'suggestions', firebaseId), { comments });
            }
        } catch (error) {
            console.error('Erreur suppression commentaire:', error);
            alert('Erreur lors de la suppression.');
        }
    }

    async toggleLike(firebaseId) {
        if (!authManager.currentUser) {
            alert('Vous devez être connecté pour liker.');
            showAuthModal();
            return;
        }

        try {
            const suggestion = this.suggestions.find(s => s.firebaseId === firebaseId);
            if (suggestion) {
                const likes = suggestion.likes || [];
                const userId = authManager.currentUser.uid;
                const hasLiked = likes.includes(userId);
                const newLikes = hasLiked 
                    ? likes.filter(id => id !== userId)
                    : [...likes, userId];
                await updateDoc(doc(db, 'suggestions', firebaseId), { likes: newLikes });
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    }

    async addComment(firebaseId) {
        if (!authManager.currentUser) {
            alert('Vous devez être connecté pour commenter.');
            showAuthModal();
            return;
        }

        const inputElement = document.getElementById(`comment-input-${firebaseId}`);
        const commentText = inputElement.value.trim();
        if (!commentText) return;

        try {
            const suggestion = this.suggestions.find(s => s.firebaseId === firebaseId);
            if (suggestion) {
                const newComment = {
                    author: authManager.currentUser.displayName || authManager.currentUser.email.split('@')[0],
                    authorId: authManager.currentUser.uid,
                    text: commentText,
                    createdAt: new Date().toLocaleString('fr-FR')
                };
                const comments = suggestion.comments || [];
                await updateDoc(doc(db, 'suggestions', firebaseId), {
                    comments: [...comments, newComment]
                });
                inputElement.value = '';
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    }

    renderSuggestions() {
        const container = document.getElementById('suggestionsList');
        if (!container) return;

        if (this.suggestions.length === 0) {
            container.innerHTML = '<div class="no-suggestions">Aucune suggestion pour le moment. Sois le premier à en ajouter une ! 💡</div>';
            return;
        }

        const isAdmin = authManager.isAdmin;

        container.innerHTML = this.suggestions.map(suggestion => {
            const likes = suggestion.likes || [];
            const userId = authManager.currentUser ? authManager.currentUser.uid : null;
            const hasLiked = userId && likes.includes(userId);

            const commentsHtml = (suggestion.comments || []).length > 0
                ? suggestion.comments.map((comment, index) => `
                    <div class="comment">
                        <span class="comment-author">${this.escapeHtml(comment.author)}:</span>
                        <span class="comment-text">${this.escapeHtml(comment.text)}</span>
                        ${isAdmin ? `<button class="delete-comment-btn" onclick="suggestionsManager.deleteComment('${suggestion.firebaseId}', ${index})" title="Supprimer">🗑️</button>` : ''}
                    </div>
                `).join('')
                : '<div class="no-comments">Aucun commentaire pour le moment</div>';

            return `
                <div class="suggestion-card" data-id="${suggestion.firebaseId}">
                    <div class="suggestion-header">
                        <div class="suggestion-title">${this.escapeHtml(suggestion.title)}</div>
                        <div class="suggestion-meta">
                            <span class="suggestion-author">${this.escapeHtml(suggestion.author)}</span>
                            ${isAdmin ? `<button class="delete-suggestion-btn" onclick="suggestionsManager.deleteSuggestion('${suggestion.firebaseId}')">🗑️ Supprimer</button>` : ''}
                        </div>
                    </div>
                    <div class="suggestion-text">${this.escapeHtml(suggestion.text)}</div>
                    <div class="suggestion-actions">
                        <button class="like-btn ${hasLiked ? 'liked' : ''}" onclick="suggestionsManager.toggleLike('${suggestion.firebaseId}')">
                            <span>👍</span>
                            <span class="like-count">${likes.length}</span>
                        </button>
                    </div>
                    <div class="comments-section">
                        <div class="comments-title">💬 Commentaires (${(suggestion.comments || []).length})</div>
                        <div class="comment-input-group">
                            <input 
                                type="text" 
                                id="comment-input-${suggestion.firebaseId}" 
                                placeholder="Ajoute un commentaire..."
                                maxlength="200"
                            >
                            <button class="comment-btn" onclick="suggestionsManager.addComment('${suggestion.firebaseId}')">Poster</button>
                        </div>
                        <div class="comments-list">
                            ${commentsHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========== GLOBAL INSTANCES ==========
const authManager = new AuthManager();
const suggestionsManager = new SuggestionsManager();

// Exposition sur window pour les onclick inline du HTML
window.authManager = authManager;
window.suggestionsManager = suggestionsManager;
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.showLoginTab = showLoginTab;
window.showSignupTab = showSignupTab;

// ========== AUTH MODAL FUNCTIONS ==========
function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('auth-message').textContent = '';
}

function showLoginTab() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showSignupTab() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

// ========== DOM EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    let menuOpen = false;

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            menuOpen = !menuOpen;
            navLinks.style.display = menuOpen ? 'flex' : 'none';
            hamburger.classList.toggle('active');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                if (navLinks) navLinks.style.display = 'none';
            }
        });
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const result = await authManager.login(email, password);
            const messageDiv = document.getElementById('auth-message');
            if (result.success) {
                messageDiv.textContent = 'Connexion réussie !';
                messageDiv.className = 'auth-message success';
                setTimeout(() => closeAuthModal(), 1500);
            } else {
                messageDiv.textContent = result.error;
                messageDiv.className = 'auth-message error';
            }
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const result = await authManager.signup(name, email, password);
            const messageDiv = document.getElementById('auth-message');
            if (result.success) {
                messageDiv.textContent = 'Inscription réussie !';
                messageDiv.className = 'auth-message success';
                setTimeout(() => closeAuthModal(), 1500);
            } else {
                messageDiv.textContent = result.error;
                messageDiv.className = 'auth-message error';
            }
        });
    }

    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 51, 102, 0.3)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 51, 102, 0.1)';
        }
    });

    window.onclick = function(event) {
        const modal = document.getElementById('auth-modal');
        if (event.target == modal) {
            closeAuthModal();
        }
    };

    const navItems = document.querySelectorAll('.nav-links li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (navLinks && window.innerWidth < 768) {
                navLinks.style.display = 'none';
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (navLinks) navLinks.style.display = 'flex';
        }
    });
});
