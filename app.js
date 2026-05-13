document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');
    
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    });

    // --- Tabs Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const contentSections = document.querySelectorAll('.content-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked tab and corresponding section
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- Data Rendering ---

    // Extract raw text for comparison by removing letters like "أ) "
    const normalizeAnswer = (text) => {
        return text.replace(/^[أ-د]\) /, '').trim();
    };

    // Function to render MCQ/TF Questions
    const renderQuestions = (dataArray, containerId, isTF = false) => {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; // Clear existing

        dataArray.forEach(q => {
            const card = document.createElement('div');
            card.className = 'q-card quiz-question-card';
            
            // Generate choices for T/F if missing
            let choices = q.choices;
            if (isTF && (!choices || choices.length === 0)) {
                choices = ['صح', 'خطأ'];
            }
            
            // Build choices HTML
            let choicesHTML = '';
            if (choices && choices.length > 0) {
                choicesHTML = '<div class="q-choices">';
                choices.forEach((choice, cIndex) => {
                    const choiceId = `q_${containerId}_${q.num}_c${cIndex}`;
                    choicesHTML += `
                        <label class="quiz-option-label" for="${choiceId}">
                            <input type="radio" id="${choiceId}" name="q_${containerId}_${q.num}" value="${choice}">
                            ${choice}
                        </label>
                    `;
                });
                choicesHTML += '</div>';
            }

            // Answer style class
            const isCorrectAnswer = q.answer.includes('صح');
            const ansClass = (isTF && isCorrectAnswer) ? 'ans-text correct' : 'ans-text';
            const answerIcon = (isTF && isCorrectAnswer) ? '✅' : (isTF ? '❌' : '✔');
            
            // Clean correct answer for comparison
            const correctAnswerString = q.answer.replace('الإجابة الصحيحة: ', '').replace('✔ الإجابة: ', '').trim();
            const correctRaw = normalizeAnswer(correctAnswerString);

            card.innerHTML = `
                <div class="q-num">سؤال ${q.num}</div>
                <div class="q-text">${q.q}</div>
                ${choicesHTML}
                <div class="answer-box quiz-explanation">
                    <div class="${ansClass}">${answerIcon} الإجابة: ${correctAnswerString}</div>
                    <div class="reason-text">💡 <strong>السبب:</strong> ${q.reason}</div>
                </div>
            `;

            // Interactive Logic (Auto-reveal on selection)
            const labels = card.querySelectorAll('.quiz-option-label');
            const answerBox = card.querySelector('.answer-box');
            
            labels.forEach(label => {
                const input = label.querySelector('input');
                input.addEventListener('change', () => {
                    // Visual selection update
                    labels.forEach(l => l.classList.remove('selected'));
                    label.classList.add('selected');
                    
                    const inputValueRaw = normalizeAnswer(input.value);
                    
                    // Validate and show result
                    labels.forEach(l => {
                        const inpt = l.querySelector('input');
                        const inptValueRaw = normalizeAnswer(inpt.value);
                        inpt.disabled = true; // Disable all after selection
                        
                        if (inptValueRaw === correctRaw || inpt.value === correctAnswerString) {
                            l.classList.add('correct-ans');
                        } else if (inpt.checked && (inptValueRaw !== correctRaw && inpt.value !== correctAnswerString)) {
                            l.classList.add('wrong-ans');
                        }
                    });

                    // Show the explanation smoothly
                    answerBox.classList.add('show');
                });
            });

            container.appendChild(card);
        });
    };

    // Function to render Tricks (Rules)
    const renderTricks = (dataArray, containerId, icon) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        dataArray.forEach((trick, index) => {
            const parts = trick.split('→');
            let formattedTrick = trick;
            if (parts.length === 2) {
                formattedTrick = `${parts[0]} <span class="trick-highlight">→ ${parts[1]}</span>`;
            }

            const item = document.createElement('div');
            item.className = 'trick-item';
            item.innerHTML = `
                <div class="trick-icon">${icon}</div>
                <div class="trick-text">${index + 1}. ${formattedTrick}</div>
            `;
            container.appendChild(item);
        });
    };

    // Render Initial Data
    if (typeof SECTION1_QUESTIONS !== 'undefined') {
        renderQuestions(SECTION1_QUESTIONS, 'grid-section1');
        renderQuestions(MCQ_BANK, 'grid-section2');
        renderQuestions(TF_BANK, 'grid-section3', true);
        renderTricks(MCQ_TRICKS, 'list-section4', '⚡');
        renderTricks(TF_TRICKS, 'list-section5', '🎯');
    } else {
        console.error("Data arrays are not defined. Make sure data.js is loaded properly.");
    }

    // --- Search Functionality ---
    const handleSearch = (inputId, containerId) => {
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = container.querySelectorAll('.q-card');
            
            cards.forEach(card => {
                const text = card.innerText.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    };

    handleSearch('search-mcq', 'grid-section2');
    handleSearch('search-tf', 'grid-section3');

    // --- Quiz Functionality (Test Yourself) ---
    const quizSetupDiv = document.getElementById('quiz-setup');
    const activeQuizDiv = document.getElementById('active-quiz');
    const quizResultDiv = document.getElementById('quiz-result');
    const quizErrorMsg = document.getElementById('quiz-error');
    
    let currentQuizData = []; // Holds the generated quiz questions
    
    // Utility to shuffle an array
    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };



    document.getElementById('start-quiz-btn').addEventListener('click', () => {
        const mcqCount = parseInt(document.getElementById('mcq-count').value) || 0;
        const tfCount = parseInt(document.getElementById('tf-count').value) || 0;

        if (mcqCount + tfCount > 100 || mcqCount + tfCount === 0) {
            quizErrorMsg.style.display = 'block';
            return;
        }
        quizErrorMsg.style.display = 'none';

        // Prepare Questions pool
        // We will combine Doctor's MCQ and MCQ Bank for MCQs
        const allMCQs = [...SECTION1_QUESTIONS, ...MCQ_BANK];
        const allTFs = [...TF_BANK];

        // Ensure we don't request more than available
        const finalMcqCount = Math.min(mcqCount, allMCQs.length);
        const finalTfCount = Math.min(tfCount, allTFs.length);

        const selectedMCQs = shuffleArray(allMCQs).slice(0, finalMcqCount);
        const selectedTFs = shuffleArray(allTFs).slice(0, finalTfCount);

        // Map them into a standardized format for the quiz
        currentQuizData = [
            ...selectedMCQs.map(q => ({ type: 'mcq', ...q })),
            ...selectedTFs.map(q => ({ 
                type: 'tf', 
                q: q.q, 
                choices: ['صح', 'خطأ'], 
                answer: q.answer, 
                reason: q.reason 
            }))
        ];
        
        currentQuizData = shuffleArray(currentQuizData);

        renderActiveQuiz();
        quizSetupDiv.style.display = 'none';
        activeQuizDiv.style.display = 'block';
        window.scrollTo({ top: document.getElementById('section6').offsetTop, behavior: 'smooth' });
    });

    const renderActiveQuiz = () => {
        const container = document.getElementById('quiz-questions-container');
        container.innerHTML = '';

        currentQuizData.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'q-card quiz-question-card';
            card.dataset.index = index;
            
            let choicesHTML = '';
            q.choices.forEach((choice, cIndex) => {
                const choiceId = `quiz_q${index}_c${cIndex}`;
                choicesHTML += `
                    <label class="quiz-option-label" for="${choiceId}">
                        <input type="radio" id="${choiceId}" name="quiz_q${index}" value="${choice}">
                        ${choice}
                    </label>
                `;
            });

            card.innerHTML = `
                <div class="q-num">سؤال ${index + 1}</div>
                <div class="q-text">${q.q}</div>
                <div class="q-choices">
                    ${choicesHTML}
                </div>
                <div class="answer-box quiz-explanation">
                    <div class="reason-text">💡 <strong>السبب:</strong> ${q.reason}</div>
                </div>
            `;
            container.appendChild(card);
            
            // Add radio change visual selection logic
            const labels = card.querySelectorAll('.quiz-option-label');
            labels.forEach(label => {
                const input = label.querySelector('input');
                input.addEventListener('change', () => {
                    labels.forEach(l => l.classList.remove('selected'));
                    if(input.checked) label.classList.add('selected');
                });
            });
        });
    };

    document.getElementById('submit-quiz-btn').addEventListener('click', () => {
        let correctCount = 0;
        const container = document.getElementById('quiz-questions-container');
        const cards = container.querySelectorAll('.quiz-question-card');

        cards.forEach(card => {
            const index = card.dataset.index;
            const qData = currentQuizData[index];
            const selectedInput = card.querySelector(`input[name="quiz_q${index}"]:checked`);
            const labels = card.querySelectorAll('.quiz-option-label');
            const explanation = card.querySelector('.quiz-explanation');

            const correctAnswerString = qData.answer.replace('الإجابة الصحيحة: ', '').replace('✔ الإجابة: ', '').trim();
            const correctRaw = normalizeAnswer(correctAnswerString);

            // Highlight answers
            labels.forEach(label => {
                const input = label.querySelector('input');
                const inputValueRaw = normalizeAnswer(input.value);
                
                // Disable input after submit
                input.disabled = true;

                if (inputValueRaw === correctRaw || input.value === correctAnswerString) {
                    label.classList.add('correct-ans');
                } else if (input.checked && (inputValueRaw !== correctRaw && input.value !== correctAnswerString)) {
                    label.classList.add('wrong-ans');
                }
            });

            // Calculate Score
            if (selectedInput) {
                const selectedRaw = normalizeAnswer(selectedInput.value);
                if (selectedRaw === correctRaw || selectedInput.value === correctAnswerString) {
                    correctCount++;
                }
            }

            // Show explanation
            explanation.classList.add('show');
        });

        // Show Results
        activeQuizDiv.style.display = 'none';
        quizResultDiv.style.display = 'block';
        
        const total = currentQuizData.length;
        const percentage = Math.round((correctCount / total) * 100);
        
        document.getElementById('score-display').innerText = `${percentage}%`;
        document.getElementById('score-details').innerText = `أجبت بشكل صحيح على ${correctCount} من أصل ${total} سؤال.`;
        
        const scoreMsg = document.getElementById('score-message');
        if (percentage >= 85) {
            scoreMsg.innerText = "أداء ممتاز! أنت جاهز تماماً للامتحان يا وحش! 🌟";
            scoreMsg.style.color = "var(--success)";
        } else if (percentage >= 65) {
            scoreMsg.innerText = "أداء جيد جداً! راجع بعض النقاط وستكون جاهزاً! 👍";
            scoreMsg.style.color = "var(--primary)";
        } else {
            scoreMsg.innerText = "تحتاج لمزيد من المراجعة. ارجع لبنوك الأسئلة والبصمجة! 📚";
            scoreMsg.style.color = "var(--danger)";
        }
        
        // Ensure user can see the result, then scroll down to review
        window.scrollTo({ top: quizResultDiv.offsetTop, behavior: 'smooth' });
        
        // Show the active quiz container again but hide the submit button so they can review answers
        activeQuizDiv.style.display = 'block';
        document.querySelector('.quiz-actions').style.display = 'none';
        // Move result to the top logically
        activeQuizDiv.parentElement.insertBefore(quizResultDiv, activeQuizDiv);
    });

    document.getElementById('restart-quiz-btn').addEventListener('click', () => {
        quizResultDiv.style.display = 'none';
        activeQuizDiv.style.display = 'none';
        quizSetupDiv.style.display = 'block';
        document.querySelector('.quiz-actions').style.display = 'block';
        
        // Move result div back to its original position (end of section6)
        document.getElementById('section6').appendChild(quizResultDiv);
        
        // Reset form
        document.getElementById('mcq-count').value = '10';
        document.getElementById('tf-count').value = '10';
        window.scrollTo({ top: document.getElementById('section6').offsetTop, behavior: 'smooth' });
    });
});
