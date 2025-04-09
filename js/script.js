const categories = { 21: "Sports", 27: "Animals", 17: "Science & Nature", 23: "History", 25: "Art" };
const points = [10, 20, 30, 40, 50];
const totalScore = document.getElementById("total");
const submitResponseButton = document.getElementById("submitResponse");
const feedback = document.getElementById("feedback");

/* add event listeners for start & reset buttons here */
document.getElementById("startButton").addEventListener('click', setToken);
document.getElementById("resetButton").addEventListener('click', resetGame);

const categoryElements = document.getElementsByClassName("category");
const questionElements = document.getElementsByClassName("question");

//using jQuery get session token 
function setToken() {
    var data = "https://opentdb.com/api_token.php?command=request";
    
    $.ajax({
        url: data,
        method: "GET",
        dataType: "JSON"
    }).done(function(response) {
        if (response.response_code === 0 && response.token) {
            window.localStorage.setItem("sessionToken", response.token);
            startGame(); 
        }
    });
}

function startGame() {
    //Disable and enable buttons
    document.getElementById("startButton").disabled = true;
    document.getElementById("resetButton").disabled = false;
    
    /* call populateBoard function */
    populateBoard();

    /* zero out any previous score */
    totalScore.innerText = 0;
    
    /* Make sure we only have one event listener on the submit button */
    submitResponseButton.removeEventListener("click", checkResponse);
    submitResponseButton.addEventListener("click", checkResponse);
}

function populateBoard() {
    const categoryDivs = document.querySelectorAll('.category');
    const questionDivs = document.querySelectorAll('.question');

    const categoryKeys = Object.keys(categories); // ["21", "27", "17", "23", "25"]
    const numCategories = categoryKeys.length;

    // Fill in category headers
    for (let i = 0; i < categoryDivs.length && i < categoryKeys.length; i++) {
        const categoryId = categoryKeys[i];
        categoryDivs[i].textContent = categories[categoryId];
        categoryDivs[i].setAttribute('data-cat', categoryId);
    }

    // Fill in question blocks
    for (let i = 0; i < questionDivs.length; i++) {
        const row = Math.floor(i / numCategories); // determines difficulty by row
        const col = i % numCategories;
        const categoryId = categoryKeys[col];
        const pointValue = points[row];

        const questionDiv = questionDivs[i];
        questionDiv.textContent = pointValue;
        questionDiv.id = 'question-' + i;
        questionDiv.setAttribute('data-categoryId', categoryId); // important for your API call
        questionDiv.setAttribute('data-difficulty', getDifficulty(pointValue));
        questionDiv.setAttribute('data-points', pointValue); // Fixed attribute name for points
        questionDiv.addEventListener('click', loadQuestion);
    }
}

function getDifficulty(points) {
    switch(points) {
        case 10:
            return "easy";
        case 20:
        case 30:
        case 40:
            return "medium";
        case 50:
            return "hard";
    }
}

function loadQuestion() {
    const categoryId = this.getAttribute('data-categoryid'); 
    const difficulty = this.getAttribute('data-difficulty');
    const pointValue = this.getAttribute('data-points');
    
    console.log("Loading question with:", {
        categoryId: categoryId,
        difficulty: difficulty,
        pointValue: pointValue,
        elementId: this.id
    });
    
    // Store the current question ID 
    window.localStorage.setItem("currentIndex", this.id);
    window.localStorage.setItem("currentPoints", pointValue);
    
    // Build the API URL 
    const sessionToken = window.localStorage.getItem("sessionToken");
    const apiUrl = `https://opentdb.com/api.php?amount=1&category=${categoryId}&difficulty=${difficulty}&token=${sessionToken}`;
    
    console.log("API URL:", apiUrl);
    
    // Make the API call 
    $.ajax({
        url: apiUrl,
        method: "GET",
        dataType: "JSON"
    })
    .done(function(response) {
        console.log("API Response:", response);
        
        if (response.response_code === 0 && response.results && response.results.length > 0) {
            viewQuestion(response);
        } else {
            console.error("API returned unsuccessful response code:", response.response_code);
            
            // Handle specific error codes
            let errorMessage = "Error loading question. Please try again.";
            if (response.response_code === 4) {
                errorMessage = "All questions for this category/difficulty have been used. Please reset the game.";
            }
            
            alert(errorMessage);
        }
    })
    .fail(function(error) {
        console.error("Failed to load question:", error);
        alert("Failed to load question. Please check your internet connection and try again.");
    });
}

function viewQuestion(response) {    
    const questionData = response.results[0];
    
    // decode HTML 
    function decodeHTML(html) {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    }
    
    // Get  modal elements
    const modal = document.getElementById("qaModal");
    const questionElement = document.getElementById("questionArea");
    const answersElement = document.getElementById("answerArea");
    
    // Decode HTML 
    const questionText = decodeHTML(questionData.question);
    const correctAnswer = decodeHTML(questionData.correct_answer);
    const incorrectAnswers = questionData.incorrect_answers.map(answer => decodeHTML(answer));
    
    // Create an array with all answers and shuffle it
    let allAnswers = [...incorrectAnswers, correctAnswer];
    allAnswers = shuffle(allAnswers);
    
    // Display  question
    questionElement.innerHTML = questionText;
    
    // Clear previous answers
    answersElement.innerHTML = "";
    
    // Add answers as radio buttons
    allAnswers.forEach((answer, index) => {
        const radioId = `answer${index}`;
        const isCorrect = answer === correctAnswer;
        
        // Create HTML
        const answerOption = document.createElement('div');
        answerOption.className = 'answer-option';
        answerOption.innerHTML = `
            <input type="radio" id="${radioId}" name="qa" value="${isCorrect ? 'correct' : 'incorrect'}">
            <label for="${radioId}">${answer}</label>
        `;
        
        answersElement.appendChild(answerOption);
    });
    
    // Add the submit button back after clearing
    const submitButton = document.createElement('button');
    submitButton.id = 'submitResponse';
    submitButton.textContent = 'Submit Answer';
    answersElement.appendChild(submitButton);
    
    window.localStorage.setItem("correctAnswer", correctAnswer);
    
    modal.style.display = "block";
    
    const closeX = document.getElementsByClassName("close")[0];
    
    // When the user clicks on <span> (x), close the modal
    closeX.onclick = function() {
        modal.style.display = "none";
    };
    
    // Reset the event listener
    document.getElementById("submitResponse").removeEventListener("click", checkResponse);
    document.getElementById("submitResponse").addEventListener("click", checkResponse);
}

function checkResponse() {
    const modal = document.getElementById("qaModal");
    const selectedRadio = document.querySelector('input[name="qa"]:checked');
    
    const clickedAnswer = selectedRadio.value;
    const correctAnswerText = window.localStorage.getItem("correctAnswer");
    
    let currentScore = parseInt(totalScore.innerText); 
    
    const clickedQuestionId = window.localStorage.getItem("currentIndex");
    const questionElement = document.getElementById(clickedQuestionId);
    const questionPoints = parseInt(window.localStorage.getItem("currentPoints"));
    
    // Determines whether the checked answer is correct
    // Either adds (if correct) or subtracts (if incorrect)
    if (clickedAnswer === "correct") {
        currentScore += questionPoints;  
        // "Correct!" is displayed 
        feedback.innerHTML = "Correct!";
    } else {
        // displays the correct answer in the feedback div
        feedback.innerHTML = "Wrong! The correct answer is: " + correctAnswerText;
        currentScore -= questionPoints;
    }

    totalScore.innerText = currentScore;
    
    // Removes text (point value) 
    questionElement.textContent = "";
    // Remove the event listener 
    questionElement.removeEventListener('click', loadQuestion);
    
    modal.style.display = "none";
}

function resetGame() {
    // Resets score to zero
    totalScore.innerText = 0;
    
    // Remove all ids from "question" divs
    // Remove event listener from all "question" divs
    Array.from(questionElements).forEach(question => {
        question.textContent = ""; 
        question.removeAttribute('data-categoryId');
        question.removeAttribute('data-difficulty');
        question.removeAttribute('data-points');
        question.id = "";
        question.removeEventListener('click', loadQuestion); 
    });
    
    // Remove all text from category boxes
    Array.from(categoryElements).forEach(cat => {
        cat.textContent = ""; 
        cat.removeAttribute('data-cat');
    });
    
    // Disable reset button, and enable start button
    document.getElementById("startButton").disabled = false;
    document.getElementById("resetButton").disabled = true;

    feedback.innerHTML = "Click Start to begin.";
}

//shuffle function given
function shuffle(array) {
    for(let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; 
    }
    return array;
}
