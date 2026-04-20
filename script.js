// Mobile Menu Toggle
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

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
            // Close mobile menu if open
            if (navLinks) {
                navLinks.style.display = 'none';
            }
        }
    });
});

// Suggestions System avec Firebase
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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
                this.suggestions.push({
                    firebaseId: doc.id,
                    ...doc.data()
                });
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
        const author = document.getElementById('suggestionAuthor').value.trim() || 'Anonyme';
        const title = document.getElementById('suggestionTitle').value.trim();
        const text = document.getElementById('suggestionText').value.trim();

        if (!title || !text) return;

        try {
            await addDoc(this.suggestionsRef, {
                author,
                title,
                text,
                likes: 0,
                comments: [],
                createdAt: new Date()
            });

            document.querySelector('.suggestion-form').reset();
            alert('Merci pour ta suggestion ! 🎉');
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'envoi');
        }
    }

    async toggleLike(firebaseId) {
        try {
            const suggestion = this.suggestions.find(s => s.firebaseId === firebaseId);
            if (suggestion) {
                const userLikes = JSON.parse(localStorage.getItem(`likes_${firebaseId}`) || '[]');
                const userId = this.getOrCreateUserId();
                
                const hasLiked = userLikes.includes(userId);
                const newLikes = hasLiked 
                    ? userLikes.filter(id => id !== userId)
                    : [...userLikes, userId];

                localStorage.setItem(`likes_${firebaseId}`, JSON.stringify(newLikes));
                
                await updateDoc(doc(db, 'suggestions', firebaseId), {
                    likes: newLikes.length
                });
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    }

    async addComment(firebaseId) {
        const inputElement = document.getElementById(`comment-input-${firebaseId}`);
        const commentText = inputElement.value.trim();
        if (!commentText) return;

        try {
            const suggestion = this.suggestions.find(s => s.firebaseId === firebaseId);
            if (suggestion) {
                const newComment = {
                    author: 'Utilisateur',
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

    getOrCreateUserId() {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random()}`;
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }

    renderSuggestions() {
        const container = document.getElementById('suggestionsList');
        if (!container) return;

        if (this.suggestions.length === 0) {
            container.innerHTML = '<div class="no-suggestions">Aucune suggestion pour le moment. Sois le premier à en ajouter une ! 💡</div>';
            return;
        }

        container.innerHTML = this.suggestions.map(suggestion => {
            const userLikes = JSON.parse(localStorage.getItem(`likes_${suggestion.firebaseId}`) || '[]');
            const userId = this.getOrCreateUserId();
            const hasLiked = userLikes.includes(userId);

            return `
                <div class="suggestion-card" data-id="${suggestion.firebaseId}">
                    <div class="suggestion-header">
                        <div class="suggestion-title">${this.escapeHtml(suggestion.title)}</div>
                        <div class="suggestion-author">${this.escapeHtml(suggestion.author)}</div>
                    </div>
                    <div class="suggestion-text">${this.escapeHtml(suggestion.text)}</div>
                    <div class="suggestion-actions">
                        <button class="like-btn ${hasLiked ? 'liked' : ''}" onclick="suggestionsManager.toggleLike('${suggestion.firebaseId}')">
                            <span>👍</span>
                            <span class="like-count">${suggestion.likes || 0}</span>
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
                            ${(suggestion.comments || []).length > 0 
                                ? suggestion.comments.map(comment => `
                                    <div class="comment">
                                        <span class="comment-author">${this.escapeHtml(comment.author)}:</span>
                                        <span class="comment-text">${this.escapeHtml(comment.text)}</span>
                                    </div>
                                `).join('')
                                : '<div class="no-comments">Aucun commentaire pour le moment</div>'
                            }
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

const suggestionsManager = new SuggestionsManager();

// Navbar Background Change on Scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 51, 102, 0.3)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 51, 102, 0.1)';
    }
});

// Animations on Scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe event cards and stat cards
document.querySelectorAll('.event-card, .stat, .info-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// CTA Button Animation
const ctaBtn = document.querySelector('.cta-btn');
if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
        alert('Bienvenue ! Rejoins-nous pour plus d\'infos sur nos événements 🎉');
    });
}

// Responsive Mobile Menu
const navItems = document.querySelectorAll('.nav-links li');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (navLinks && window.innerWidth < 768) {
            navLinks.style.display = 'none';
        }
    });
});

// Window Resize Handler
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        if (navLinks) {
            navLinks.style.display = 'flex';
        }
    }
});
