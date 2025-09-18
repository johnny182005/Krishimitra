// --- DOM Element Selection ---
const el = id => document.getElementById(id);

const queryText = el('queryText');
const langSelect = el('langSelect');
const micBtn = el('micBtn');
const imageInput = el('imageInput');
const imagePreviewContainer = el('imagePreviewContainer');
const sendBtn = el('sendBtn');
const responseArea = el('responseArea');
const responseText = el('responseText');
const responseMeta = el('responseMeta');
const responseActions = el('responseActions');
const loader = el('loader');
const playAudio = el('playAudio');
const saveFeedback = el('saveFeedback');
const historyList = el('historyList');
const escalateBtn = el('escalateBtn');
const reportBtn = el('reportBtn');

// --- Application State ---
const context = {
  location: null,
  lastImage: null,
  history: JSON.parse(localStorage.getItem('kr_history') || '[]')
};

// --- CORE FUNCTIONS ---

/**
 * **THIS IS WHERE YOU CONNECT YOUR BACKEND**
 * Fetches an AI response from your backend server.
 * @param {string} query - The user's text query.
 * @param {string} lang - The selected language code.
 * @param {File} imageFile - The uploaded image file (optional).
 * @param {object} ctx - The user context (location, etc.).
 * @returns {Promise<object>} - A promise that resolves to the AI response.
 */
async function getAIResponse(query, lang, imageFile, ctx) {
  const API_ENDPOINT = '/api/ask'; // <-- IMPORTANT: Change this to your actual API endpoint

  // Use FormData to easily handle file uploads along with text
  const formData = new FormData();
  formData.append('query', query);
  formData.append('lang', lang);
  formData.append('context', JSON.stringify(ctx));
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    /*
    // --- REAL BACKEND CALL (when you are ready) ---
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData
      // Add headers if needed, e.g., for authentication
      // headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    return await response.json(); // Assumes your backend returns JSON like { answer: '...', confidence: 0.9 }
    */

    // --- MOCKED RESPONSE (for development/testing without a backend) ---
    console.log("Using mocked response. To use a real backend, edit `getAIResponse` in script.js.");
    return mockAIResponse(query, lang, ctx);

  } catch (error) {
    console.error('Error fetching AI response:', error);
    return {
      answer: "Sorry, I couldn't connect to the server. Please check your internet connection and try again.",
      error: true
    };
  }
}

/**
 * A mocked AI response for frontend testing.
 */
function mockAIResponse(query, lang, ctx) {
  const q = (query || '').toLowerCase();
  let text = "I'm not sure how to answer that. Could you provide a photo or more details? For urgent issues, you can use the 'Escalate' button.";

  if (!q && !ctx.lastImage) {
    text = "Please type a question or upload a photo of your crop.";
  } else if (q.includes('pesticide') || q.includes('leaf spot') || (ctx.lastImage && q.includes('leaf'))) {
    text = "Probable issue: Leaf spot. Recommendation: Remove affected lower leaves. For chemical control, use a copper-based fungicide at the recommended dosage. Please consult your local Krishibhavan for specific product guidance.";
  } else if (q.includes('price') || q.includes('market')) {
    text = "Market rates change daily. It's best to check your local mandi for today's rates. We can provide live rates if connected to a market API.";
  } else if (q.includes('weather') || q.includes('rain')) {
    text = "Weather Alert: Light showers are expected tomorrow evening. It's advisable to postpone spraying pesticides. Ensure proper drainage for low-lying fields. (This can be integrated with a local weather API).";
  }

  if (ctx && ctx.location) {
    text = `(Based on your approximate location) ${text}`;
  }

  return new Promise(resolve => {
    setTimeout(() => resolve({
      answer: text,
      confidence: 0.85,
      sources: ['Local Agri Dept Guidelines']
    }), 1200); // Simulate network delay
  });
}

/**
 * Handles the user query, displays loading state, and renders the response.
 */
async function handleQuery() {
  const text = queryText.value.trim();
  const lang = langSelect.value;
  const imageFile = context.lastImage;

  if (!text && !imageFile) {
    alert("Please enter a question or upload an image.");
    return;
  }

  // --- UI Update: Show loading state ---
  sendBtn.disabled = true;
  sendBtn.textContent = 'Analyzing...';
  responseArea.classList.remove('hidden');
  responseText.innerHTML = '';
  loader.classList.remove('hidden');
  responseActions.classList.add('hidden');
  responseMeta.textContent = `Analyzing your query...`;

  // --- API Call ---
  const res = await getAIResponse(text, lang, imageFile, { location: context.location });

  // --- UI Update: Display response ---
  loader.classList.add('hidden');
  sendBtn.disabled = false;
  sendBtn.textContent = 'Ask Now';

  if (res.error) {
    responseMeta.textContent = 'An error occurred';
    typewriterEffect(res.answer);
  } else {
    responseMeta.textContent = `Answer (Confidence: ${(res.confidence * 100).toFixed(0)}%)`;
    typewriterEffect(res.answer);
    responseActions.classList.remove('hidden');
    
    // Save to history
    const rec = { q: text, lang, ts: Date.now(), answer: res.answer };
    context.history.push(rec);
    if (context.history.length > 10) context.history.shift(); // Keep history to a reasonable size
    localStorage.setItem('kr_history', JSON.stringify(context.history));
    renderHistory();
  }
}

// --- UI & Utility Functions ---

/**
 * Renders the query history from local storage.
 */
function renderHistory() {
  historyList.innerHTML = '';
  if (!context.history.length) {
    historyList.innerHTML = '<div class="meta" style="padding: 10px;">No recent queries.</div>';
    return;
  }
  
  context.history.slice().reverse().forEach(item => {
    const d = new Date(item.ts);
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="q">${escapeHtml(item.q) || 'Image Query'}</div>
      <div class="ts">${d.toLocaleString()}</div>
      <div class="a">${escapeHtml(item.answer)}</div>`;
    historyList.appendChild(div);
  });
}

/**
 * Simulates a typewriter effect for displaying text.
 * @param {string} text - The text to display.
 */
function typewriterEffect(text) {
    let i = 0;
    responseText.innerHTML = "";
    const cursor = `<span class="cursor"></span>`;
    responseText.innerHTML = cursor;

    const typing = setInterval(() => {
        if (i < text.length) {
            responseText.innerHTML = text.slice(0, i + 1) + cursor;
            i++;
        } else {
            clearInterval(typing);
            responseText.innerHTML = text; // Remove cursor when done
        }
    }, 20); // Adjust speed of typing here
}


/**
 * Escapes HTML to prevent XSS.
 * @param {string} s - The string to escape.
 * @returns {string}
 */
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/**
 * Handles image preview when a file is selected.
 */
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const img = document.createElement('img');
  img.className = 'img-preview';
  img.alt = 'Uploaded plant image';
  imagePreviewContainer.innerHTML = '';
  imagePreviewContainer.appendChild(img);

  const reader = new FileReader();
  reader.onload = () => { img.src = reader.result; };
  reader.readAsDataURL(file);
  context.lastImage = file;
}

// --- Event Listeners ---
sendBtn.addEventListener('click', handleQuery);
queryText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendBtn.click();
  }
});
imageInput.addEventListener('change', handleImageUpload);
saveFeedback.addEventListener('click', () => alert('Thanks! Your feedback helps us improve.'));
reportBtn.addEventListener('click', () => alert('Reported. A moderator will review this response.'));
escalateBtn.addEventListener('click', () => {
    const last = context.history[context.history.length-1];
    const subject = encodeURIComponent('Krishimitra Query Escalation');
    const body = encodeURIComponent(
        `Farmer Query:\n${last ? last.q : queryText.value}\n\nLast AI Answer:\n${last ? last.answer : '(none)'}`
    );
    window.location.href = `mailto:agri-officer@example.com?subject=${subject}&body=${body}`;
});
playAudio.addEventListener('click', () => {
    const txt = responseText.textContent || '';
    if(!txt || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(txt);
    utter.lang = langSelect.value || 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
});


// Web Speech API for voice input
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    
    recognition.onstart = () => { micBtn.innerHTML = '🎙️ Listening...'; micBtn.classList.add('active'); };
    recognition.onend = () => { micBtn.innerHTML = '<span class="mic-icon">🎤</span> Speak'; micBtn.classList.remove('active'); };
    recognition.onerror = (e) => console.error('Speech recognition error', e);
    recognition.onresult = (event) => {
        const speech = event.results[0][0].transcript;
        queryText.value = queryText.value ? `${queryText.value} ${speech}` : speech;
    };

    micBtn.addEventListener('click', () => {
        recognition.lang = langSelect.value;
        recognition.start();
    });
} else {
    micBtn.disabled = true;
    micBtn.title = "Voice input not supported in this browser.";
}

// --- Initial Setup ---
renderHistory();
// Get approximate location on load
navigator.geolocation?.getCurrentPosition(
    pos => { context.location = { lat: pos.coords.latitude, lon: pos.coords.longitude }; },
    err => { console.warn('Could not get geolocation.', err); },
    { timeout: 5000 }
);