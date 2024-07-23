let quizData;
let userAnswers = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft;
function loadQuizData() {
    const maDe = document.getElementById('maDe').value;
    const maHocVien = document.getElementById('maHocVien').value;

    if (!maDe || !maHocVien) {
        alert('Vui lòng nhập mã đề thi và mã học viên.');
        return;
    }

    fetch(`https://script.google.com/macros/s/AKfycbzAZTZRHpFNoE_iSx5EuwnaaBq9QxU_zenb0mZqmMjN02DNwwCzsxE0DMRgS1f_ZUwr/exec?maDe=${maDe}&userID=${maHocVien}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            if (!data.length) {
                alert('Không tìm thấy dữ liệu đề thi hoặc thiếu thông tin thời gian làm bài.');
                return;
            }
            quizData = {
                maDe: maDe,
                userID: maHocVien,
                timeLimit: data[0].thoiGianLamBai || 300, // Sử dụng thời gian làm bài từ dữ liệu hoặc giá trị mặc định 300 giây
                questions: data
            };
            startQuiz();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi tải đề thi');
        });
}


function startQuiz() {
    timeLeft = parseInt(quizData.thoiGianLamBai);
    document.getElementById('start').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    currentQuestionIndex = 0;
    userAnswers = new Array(quizData.questions.length).fill(null);  // Khởi tạo mảng userAnswers
    renderQuestion();
    startTimer();
}

function renderQuestion() {
    const questionContainer = document.getElementById('question');
    const q = quizData.questions[currentQuestionIndex];

    questionContainer.innerHTML = `<h2>Câu hỏi ${currentQuestionIndex + 1}</h2><p>${q.cauHoi}</p>`;

    // Hiển thị video nếu có
    if (q.videoURL) {
        const videoID = q.videoURL.split('v=')[1];
        const embedURL = `https://www.youtube.com/embed/${videoID}`;
        questionContainer.innerHTML += `<iframe src="${embedURL}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width: 100%; height: 315px;"></iframe><br>`;
    }

    // Hiển thị hình ảnh nếu có
    if (q.imageURL) {
        questionContainer.innerHTML += `<img src="${q.imageURL}" alt="Question Image" style="max-width: 100%; height: auto;"><br>`;
    }

    // Hiển thị audio nếu có
    if (q.audioURL) {
        const soundCloudEmbedURL = `https://w.soundcloud.com/player/?url=${encodeURIComponent(q.audioURL)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
        questionContainer.innerHTML += `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="${soundCloudEmbedURL}"></iframe><br>`;
    }

    switch (q.loaiCauHoi) {
        case 'multiple_choice':
            q.cacLuaChon.forEach((option, index) => {
                const checked = userAnswers[currentQuestionIndex] === option ? 'checked' : '';
                questionContainer.innerHTML += `
            <label>
                <input type="radio" name="q${currentQuestionIndex}" value="${option}" ${checked}>
                ${option}
            </label><br>
        `;
            });
            break;

        case 'multiple_select':
            q.cacLuaChon.forEach((option, index) => {
                const checked = userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex].includes(option) ? 'checked' : '';
                questionContainer.innerHTML += `
            <label>
                <input type="checkbox" name="q${currentQuestionIndex}" value="${option}" ${checked}>
                ${option}
            </label><br>
        `;
            });
            break;

        case 'free_response':
            const freeResponseValue = userAnswers[currentQuestionIndex] || '';
            questionContainer.innerHTML += `
        <textarea name="q${currentQuestionIndex}" 
                  rows="4" 
                  style="width: 100%; padding: 10px; margin-top: 10px;"
                  placeholder="Nhập câu trả lời của bạn ở đây">${freeResponseValue}</textarea>
    `;
            break;

        case 'fill_in_blank':
            const fillInBlankValue = userAnswers[currentQuestionIndex] || '';
            questionContainer.innerHTML += `
        <input type="text" name="q${currentQuestionIndex}" 
               value="${fillInBlankValue}"
               style="width: 100%; padding: 10px; margin-top: 10px;"
               placeholder="Điền câu trả lời của bạn">
    `;
            break;

        case 'matching':
            const leftColumn = q.cacLuaChon.slice(0, q.cacLuaChon.length / 2);
            const rightColumn = q.cacLuaChon.slice(q.cacLuaChon.length / 2);
            questionContainer.innerHTML += `<div class="matching-container">`;

            questionContainer.innerHTML += `<div class="left-column">`;
            leftColumn.forEach((item, index) => {
                questionContainer.innerHTML += `
                        <div class="matching-item" draggable="true" ondragstart="drag(event)" id="left-${index}">
                            <span>${item}</span>
                        </div>
                    `;
            });
            questionContainer.innerHTML += `</div>`;

            questionContainer.innerHTML += `<div class="right-column">`;
            rightColumn.forEach((item, index) => {
                questionContainer.innerHTML += `
                        <div class="matching-item" ondrop="drop(event)" ondragover="allowDrop(event)" id="right-${index}">
                            <span>${item}</span>
                        </div>
                    `;
            });
            questionContainer.innerHTML += `</div>`;

            questionContainer.innerHTML += `</div>`;
            break;


    }

    updateNavigationButtons();
}

function updateNavigationButtons() {
    document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'inline' : 'none';
    document.getElementById('nextBtn').style.display = currentQuestionIndex < quizData.questions.length - 1 ? 'inline' : 'none';
    document.getElementById('submitBtn').style.display = currentQuestionIndex === quizData.questions.length - 1 ? 'inline' : 'none';
}

function navigate(direction) {
    saveCurrentAnswer();
    currentQuestionIndex += direction;
    renderQuestion();
}
function saveCurrentAnswer() {
    const q = quizData.questions[currentQuestionIndex];
    switch (q.loaiCauHoi) {
        case 'multiple_choice':
            const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
            userAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : null;
            break;
        case 'multiple_select':
            let selectedOptions = Array.from(document.querySelectorAll(`input[name="q${currentQuestionIndex}"]:checked`)).map(input => input.value);
            userAnswers[currentQuestionIndex] = selectedOptions.length > 0 ? selectedOptions : null;
            break;
        case 'free_response':
            userAnswers[currentQuestionIndex] = document.querySelector(`textarea[name="q${currentQuestionIndex}"]`)?.value || null;
            break;
        case 'fill_in_blank':
            userAnswers[currentQuestionIndex] = document.querySelector(`input[name="q${currentQuestionIndex}"]`)?.value || null;
            break;
        case 'matching':
            userAnswers[currentQuestionIndex] = [];
            document.querySelectorAll('.right-column .matching-item').forEach((item, index) => {
                const matchedItem = item.querySelector('.matching-item span');
                if (matchedItem) {
                    userAnswers[currentQuestionIndex][index] = matchedItem.textContent.trim();
                } else {
                    userAnswers[currentQuestionIndex][index] = null;
                }
            });
            console.log(`Matching answers for question ${currentQuestionIndex}:`, userAnswers[currentQuestionIndex]);
            break;

    }
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.id);
}

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData("text");
    const draggedElement = document.getElementById(data);
    if (!event.target.querySelector('.matching-item')) {
        event.target.appendChild(draggedElement);
    }
}

function startTimer() {
    timeLeft = quizData.timeLimit;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = `Thời gian còn lại: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function submitQuiz() {
    saveCurrentAnswer();
    clearInterval(timerInterval);
    const score = calculateScore();

    let resultsDetails = quizData.questions.map((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.dapAnDung;
        let isCorrect;
        let answerDisplay;
        let correctAnswerDisplay;

        switch (question.loaiCauHoi) {
            case 'multiple_choice':
            case 'fill_in_blank':
                isCorrect = userAnswer === correctAnswer;
                answerDisplay = userAnswer || 'Không có câu trả lời';
                correctAnswerDisplay = correctAnswer;
                break;
            case 'multiple_select':
                isCorrect = Array.isArray(userAnswer) && Array.isArray(correctAnswer) &&
                    userAnswer.length === correctAnswer.length &&
                    userAnswer.every(a => correctAnswer.includes(a));
                answerDisplay = Array.isArray(userAnswer) ? userAnswer.join(', ') : 'Không có câu trả lời';
                correctAnswerDisplay = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
                break;
            case 'free_response':
                const keyPhrases = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
                isCorrect = typeof userAnswer === 'string' && keyPhrases.some(phrase =>
                    userAnswer.toLowerCase().includes(phrase.toLowerCase())
                );
                answerDisplay = userAnswer || 'Không có câu trả lời';
                correctAnswerDisplay = keyPhrases.join(' hoặc ');
                break;
            case 'matching':
                isCorrect = Array.isArray(userAnswer) && Array.isArray(correctAnswer) &&
                    userAnswer.length === correctAnswer.length &&
                    userAnswer.every((answer, i) => answer === correctAnswer[i]);
                answerDisplay = Array.isArray(userAnswer) ? userAnswer.join(', ') : 'Không có câu trả lời';
                correctAnswerDisplay = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
                break;
            default:
                isCorrect = false;
                answerDisplay = 'Loại câu hỏi không xác định';
                correctAnswerDisplay = 'Loại câu hỏi không xác định';
        }

        return `<li>
    <h3>Câu ${index + 1}: ${isCorrect ? 'Đúng' : 'Sai'}</h3>
    <p><strong>Câu hỏi:</strong> ${question.cauHoi}</p>
    <p><strong>Câu trả lời của bạn:</strong> ${answerDisplay}</p>
    <p><strong>Đáp án đúng:</strong> ${correctAnswerDisplay}</p>
</li>`;
    }).join('');

    // Gửi kết quả lên Google Sheets
    fetch('https://script.google.com/macros/s/AKfycbzAZTZRHpFNoE_iSx5EuwnaaBq9QxU_zenb0mZqmMjN02DNwwCzsxE0DMRgS1f_ZUwr/exec', {
        method: 'POST',
        body: JSON.stringify({
            maDe: quizData.maDe,
            userID: quizData.userID,
            score: score,
            answers: userAnswers
        })
    });

    // Hiển thị kết quả chi tiết
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    document.getElementById('result').innerHTML = `
<h2>Kết quả</h2>
<p>Điểm của bạn: ${score}/${quizData.questions.length}</p>
<ul>${resultsDetails}</ul>
`;
}

function calculateScore() {
    let score = 0;
    quizData.questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = q.dapAnDung;
        let isCorrect = false;

        switch (q.loaiCauHoi) {
            case 'free_response':
                if (typeof userAnswer === 'string' && userAnswer.trim() !== '') {
                    const keyPhrases = correctAnswer.toLowerCase().split(',').map(phrase => phrase.trim());
                    isCorrect = keyPhrases.some(phrase => userAnswer.toLowerCase().includes(phrase));
                }
                break;
            case 'multiple_select':
                if (Array.isArray(userAnswer) && Array.isArray(correctAnswer) && userAnswer.length > 0) {
                    isCorrect = JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());
                }
                break;
            case 'matching':
                if (Array.isArray(userAnswer) && Array.isArray(correctAnswer) && userAnswer.length === correctAnswer.length) {
                    isCorrect = userAnswer.every((answer, i) => answer === correctAnswer[i]);
                }
                break;
            case 'fill_in_blank':
                if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
                    isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                }
                break;
            default:
                if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
                    isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                }
                break;
        }

        if (isCorrect) {
            score++;
        }
    });
    return score;
}
