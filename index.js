const Game = {
    elements : {
      addPlayerButton : document.querySelector('.addPlayerButton'),
      showCardsButton : document.querySelector('.showCardsButton'),
      startGameButton : document.querySelector('.startGameButton'),
      previousPlayerButton : document.querySelector('.previousPlayerButton'),
      nextPlayerButton : document.querySelector('.nextPlayerButton'),
      currentPlayerName : document.querySelector('.currentPlayerName'),
      playerCards : document.querySelector('.playerCards'),
      commonToolbar: document.querySelector('.commonToolbar'),
      bunkerToolbarButton : document.querySelector('.bunkerToolbarButton'),
      cataclysmToolbarButton : document.querySelector('.cataclysmToolbarButton'),
      dangerToolbarButton : document.querySelector('.dangerToolbarButton'),
      commonCards: document.querySelector('.commonCards'),
      newGameButton: document.querySelector('.newGameButton'),
      infoButton: document.querySelector('.infoButton'),
      modalOverlay: document.querySelector('#modal-overlay'),
      modalWindow: document.querySelector('#modal-window'),
      modalTitle: document.querySelector('#modal-title'),
      modalContent: document.querySelector('#modal-content'),
      modalActions: document.querySelector('#modal-actions'),
  },

  addListeners: function () {
      this.elements.addPlayerButton.onclick = this.addPlayer.bind(this)
      this.elements.startGameButton.onclick = this.startGame.bind(this)
      this.elements.showCardsButton.onclick = this.showAllCards.bind(this)
      this.elements.nextPlayerButton.onclick = this.nextPlayer.bind(this, +1)
      this.elements.previousPlayerButton.onclick = this.nextPlayer.bind(this, -1)
      this.elements.bunkerToolbarButton.onclick = this.pickBunkerCard.bind(this, 'bunker')
      this.elements.cataclysmToolbarButton.onclick = this.pickBunkerCard.bind(this, 'cataclysm')
      this.elements.dangerToolbarButton.onclick = this.pickBunkerCard.bind(this, 'danger')
      this.elements.newGameButton.onclick = this.startNewRound.bind(this)
      this.elements.infoButton.onclick = this.showInfo.bind(this)
  },

  // --- Custom Modal Logic ---
  showModal: function(config) {
    return new Promise((resolve) => {
      // Функция-обработчик для нажатия клавиш
      const keydownHandler = (event) => {
        if (event.key === 'Enter') {
          // Находим основную кнопку (которая подтверждает действие)
          const primaryButton = config.buttons.find(b => b.resolves);
          if (primaryButton) {
            // Имитируем клик по ней
            const value = inputElement ? inputElement.value : true;
            this.hideModal();
            document.removeEventListener('keydown', keydownHandler); // Убираем обработчик
            resolve(value);
          }
        }
      };

      // Добавляем обработчик при открытии окна
      document.addEventListener('keydown', keydownHandler);

      this.elements.modalTitle.textContent = config.title || '';
      this.elements.modalContent.innerHTML = ''; // Clear previous content
      this.elements.modalActions.innerHTML = '';

      if (config.message) {
        const messageP = document.createElement('p');
        messageP.textContent = config.message;
        this.elements.modalContent.appendChild(messageP);
      }

      let inputElement = null;
      if (config.prompt) {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'modal-input';
        inputElement.placeholder = config.placeholder || '';
        this.elements.modalContent.appendChild(inputElement);
      }

      config.buttons.forEach(buttonConfig => {
        const button = document.createElement('button');
        button.textContent = buttonConfig.text;
        button.onclick = () => {
          const value = inputElement ? inputElement.value : true;
          this.hideModal();
          document.removeEventListener('keydown', keydownHandler); // Убираем обработчик
          resolve(buttonConfig.resolves ? value : null);
        };
        this.elements.modalActions.appendChild(button);
      });

      this.elements.modalOverlay.style.display = 'flex';
      setTimeout(() => this.elements.modalOverlay.classList.add('visible'), 10);

      if (inputElement) {
        inputElement.focus();
      }
    });
  },

  hideModal: function() {
    this.elements.modalOverlay.classList.remove('visible');
    setTimeout(() => {
      this.elements.modalOverlay.style.display = 'none';
    }, 300); // Corresponds to CSS transition duration
  },

  // --- Replaced alert/prompt functions ---
  showAlert: function(title, message) {
    return this.showModal({
      title: title,
      message: message,
      buttons: [{ text: 'OK', resolves: true }]
    });
  },

  showPrompt: function(title, placeholder) {
    return this.showModal({
      title: title,
      prompt: true,
      placeholder: placeholder,
      buttons: [{ text: 'OK', resolves: true }]
    });
  },
  // --- End of Modal Logic ---

  showInfo: function () {
    const message = `- Карт в колоде: ${this.allCardsAmount - this.wastedCardsAmount}/${this.allCardsAmount}\n- Всего игроков: ${this.players.length}`;
    this.showAlert('Информация', message);
  },

  showAllCards: function () {
    this.elements.showCardsButton.style.display = 'none'
      for (let allCardsKey in this.allPlayerCards) {
        this.allPlayerCards[allCardsKey].forEach((card) => {
          this.elements.playerCards.innerHTML += `
            <div class="card">
                <p class="title">${card.title}</p>
                <p class="description">${card.description}</p>
                <p class="icon">${card.icon}</p>
                <p class="category">${this.translateCategory(allCardsKey)}</p>
          </div>
    `
        })
      }
    for (let allBunkerCardsKey in this.allBunkerCards) {
      this.allBunkerCards[allBunkerCardsKey].forEach((card) => {
        this.elements.playerCards.innerHTML += `
            <div class="card">
                <p class="title">${card.title}</p>
                <p class="description">${card.description}</p>
                <p class="icon">${card.icon}</p>
                <p class="category">${this.translateCategory(allBunkerCardsKey)}</p>
          </div>
    `
      })
    }
  },

  startGame : function () {
      this.elements.addPlayerButton.style.display = 'none'
      this.elements.startGameButton.style.display = 'none'
      this.elements.showCardsButton.style.display = 'none'
      this.elements.nextPlayerButton.style.display = 'flex'
      this.elements.previousPlayerButton.style.display = 'flex'
      this.elements.commonToolbar.style.display = 'block'
      this.elements.currentPlayerName.style.display = 'block'
      this.elements.commonCards.style.display = 'flex'
      this.elements.newGameButton.style.display = 'block'
      this.showPlayerCards(this.currentPlayer)
  },

  pickBunkerCard: function (category) {
      const cardPicked = this.pickRandom('bunker', category)

    this.elements.commonCards.innerHTML += `
    <div class="card">
            <p class="title">${cardPicked.title}</p>
            <p class="description">${cardPicked.description}</p>
            <p class="icon">${cardPicked.icon}</p>
            <p class="category">${this.translateCategory(category)}</p>
          </div>
    `
  },

  startNewRound: function () {
      this.elements.commonCards.innerHTML = ''
      //deletes all players
      this.players.forEach((player) => {
        for (let cardsKey in player.cards) {
          player.cards[cardsKey] = this.pickRandom('player',cardsKey)
        }
      })
      this.showPlayerCards(this.currentPlayer)

      },

  players : [],
  currentPlayer : 0,
  allCardsAmount : 0,
  wastedCardsAmount : 0,
  firstAddPlayer: true,

  addPlayer : async function () {
      if (this.firstAddPlayer) {
        this.firstAddPlayer = false
        for (let allPlayerCardsKey in this.allPlayerCards) {
          this.allCardsAmount += this.allPlayerCards[allPlayerCardsKey].length
        }

        for (let allBunkerCardsKey in this.allBunkerCards) {
          this.allCardsAmount += this.allBunkerCards[allBunkerCardsKey].length
        }
      }
    const playerName = await this.showPrompt('Новый игрок', 'Укажите ваше имя');
    if (!playerName) return; // User cancelled or entered nothing

    const newPlayer = {
      name: playerName,
      cards: {}
    }
    for (let allCardsKey in this.allPlayerCards) {
      newPlayer.cards[allCardsKey] = this.pickRandom('player',allCardsKey)
    }
    this.players.push(newPlayer)
    this.checkPlayersAmount()
  },

  checkPlayersAmount : function () {
      this.players.length >= 2 ? this.elements.startGameButton.style.display = 'block' : ''
  },

  showPlayerCards : function (playerNumber) {
      const player = this.players[playerNumber]
      let resultHTML = ''
      for (let cardsKey in player.cards) {
        resultHTML += `
          <div class="card card-hidden">
            <p class="title">${player.cards[cardsKey].title}</p>
            <p class="description">${player.cards[cardsKey].description}</p>
            <p class="icon">${player.cards[cardsKey].icon}</p>
            <p class="category">${this.translateCategory(cardsKey)}</p>
          </div>
        `
      }
      this.elements.playerCards.innerHTML = resultHTML
      this.elements.playerCards.querySelectorAll('.card').forEach((card) => {
        card.onclick = () => {
          card.classList.toggle('card-hidden')
        }
    })
      this.elements.currentPlayerName.innerHTML = player.name
  },

  nextPlayer : async function (number) {
      this.currentPlayer+=number
      if (this.currentPlayer >= this.players.length) {
          this.currentPlayer = 0
      } else if (this.currentPlayer < 0){
          this.currentPlayer = this.players.length - 1
      }
      this.elements.playerCards.innerHTML = ''
      await this.showAlert('Смена игрока', 'Передайте устройство игроку: ' + this.players[this.currentPlayer].name);
      this.showPlayerCards(this.currentPlayer);
  },

  allPlayerCards : {
    biology: [],
    health: [],
    profession: [],
    fact: [],
    hobby: [],
    phobia: [],
    baggage: [],
    perk: []
  },

  allBunkerCards : {
    bunker: [],
    cataclysm: [],
    danger: []
  },

  initCards : function() {
    for (let allCardsKey in this.allPlayerCards) {
      const request = new XMLHttpRequest();
      request.open("GET", `./data/${allCardsKey}.json`)
      request.responseType = "json"
      request.send()
      request.onload = () => {
        this.allPlayerCards[allCardsKey] = request.response
      }
    }

    for (let allBunkerCardsKey in this.allBunkerCards) {
      const request = new XMLHttpRequest();
      request.open("GET", `./data/${allBunkerCardsKey}.json`)
      request.responseType = "json"
      request.send()
      request.onload = () => {
        this.allBunkerCards[allBunkerCardsKey] = request.response
      }
    }
  },

  pickRandom : function(type, category) {
      let categoryCards
      this.wastedCardsAmount++
      switch (type) {
        case 'bunker':
          categoryCards = this.allBunkerCards[category]
          break

        case 'player':
          categoryCards = this.allPlayerCards[category]
          break
      }


    const randomNumber = Math.floor(Math.random() * categoryCards.length)
    return categoryCards.splice(randomNumber, 1)[0]
  },

  translateCategory : function (category) {
    let categoryName = ''
    switch (category){
      case 'bunker':
        categoryName = 'Бункер'
        break
      case 'cataclysm':
        categoryName = '<span style="color: red; text-shadow: 0 0 3px rgb(255 0 0);">Катастрофа</span>'
        break
      case 'danger':
        categoryName = '<span style="color: yellow; text-shadow: 0 0 3px rgb(255 221 0);">Опасность</span>'
        break
      case 'biology':
        categoryName = 'Биология'
        break
      case 'health':
        categoryName = 'Здоровье'
        break
      case 'profession':
        categoryName = 'Профессия'
        break
      case 'fact':
        categoryName = 'Факт'
        break
      case 'hobby':
        categoryName = 'Хобби'
        break
      case 'baggage':
        categoryName = 'Багаж'
        break
      case 'phobia':
        categoryName = 'Фобия'
        break
      case 'perk':
        categoryName = 'Перк'
        break
    }

    return categoryName
  },

  init: function () {
    this.initCards()
    this.addListeners()
  }
}

Game.init()
