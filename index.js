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
      playerList: document.querySelector('.playerList'),
      infoButton: document.querySelector('.infoButton'),
      lockCardsButton: document.querySelector('.lockCardsButton'),
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
      this.elements.newGameButton.onclick = this.confirmNewGame.bind(this)
      this.elements.infoButton.onclick = this.showInfo.bind(this)
      this.elements.lockCardsButton.onclick = this.toggleLockCards.bind(this)
  },

  // --- Custom Modal Logic ---
  showModal: function(config) {
    return new Promise((resolve) => {
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
          this.hideModal();
          if (inputElement) {
            resolve(buttonConfig.resolves !== null ? inputElement.value : null);
          } else {
            resolve(buttonConfig.resolves);
          }
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

  showConfirmation: function(title, message) {
    return this.showModal({
      title: title,
      message: message,
      buttons: [
        { text: 'Да', resolves: true },
        { text: 'Нет', resolves: false }
      ]
    });
  },
  // --- End of Modal Logic ---

  // --- Card Swap Logic --- // currentPlayer is the player object
  initiateCardSwap: async function(currentPlayer, cardElement) {
    const categoryClass = Array.from(cardElement.classList).find(c => c.startsWith('card-') && c !== 'card-hidden' && c !== 'card-flash');
    if (!categoryClass) return;
    const category = categoryClass.replace('card-', '');

    const otherPlayers = this.players
      .map((p, index) => ({ name: p.name, index }))
      .filter(p => p.name !== currentPlayer.name);

    if (otherPlayers.length === 0) {
      await this.showAlert('Обмен невозможен', 'Нет других игроков для обмена.');
      return;
    }

    const targetPlayerIndex = await this.showModal({
      title: `Обменять карту "${this.translateCategory(category, true)}"?`,
      message: 'Выберите игрока для обмена:',
      buttons: otherPlayers.map(p => ({ text: p.name, resolves: p.index }))
        .concat([{ text: 'Отмена', resolves: null }])
    });

    if (targetPlayerIndex === null) return;

    const targetPlayer = this.players[targetPlayerIndex];

    // Swap cards in the data model
    const cardToGive = currentPlayer.cards[category];
    const cardToReceive = targetPlayer.cards[category];
    currentPlayer.cards[category] = cardToReceive;
    targetPlayer.cards[category] = cardToGive;
    this.showPlayerCards(this.currentPlayer);
  },

  showInfo: function () {
    const message = `- Карт в колоде: ${this.allCardsAmount - this.wastedCardsAmount}/${this.allCardsAmount}\n- Всего игроков: ${this.players.length}`;
    this.showAlert('Информация', message);
  },

  // --- Card Actions ---
  async handleCardReplacement(player, cardElement) {
    const categoryClass = Array.from(cardElement.classList).find(c => c.startsWith('card-') && c !== 'card-hidden' && c !== 'card-flash');
    if (!categoryClass) return;
    const category = categoryClass.replace('card-', '');

    const confirmed = await this.showConfirmation('Заменить карту?', `Вы уверены, что хотите заменить карту "${this.translateCategory(category, true)}"?`);
    if (!confirmed) return;

    const newCard = this.pickRandom('player', category);
    if (!newCard) {
      await this.showAlert('Ошибка', 'В этой колоде закончились карты.');
      return;
    }

    // Update player data and UI
    player.cards[category] = newCard;
    cardElement.querySelector('.title').textContent = newCard.title;
    cardElement.querySelector('.description').textContent = newCard.description;
    cardElement.querySelector('.icon').textContent = newCard.icon;

    // Flash effect
    cardElement.classList.add('card-flash');
    setTimeout(() => cardElement.classList.remove('card-flash'), 500);
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
      this.elements.playerList.style.display = 'none'
      this.elements.newGameButton.style.display = 'block'
      this.elements.lockCardsButton.style.display = 'block'
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

  confirmNewGame: async function() {
    const confirmed = await this.showConfirmation('Новая игра', 'Вы уверены, что хотите начать новую игру? Все текущие карты игроков будут заменены.');
    if (confirmed) {
      this.startNewRound();
    }
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
  cardsLocked: false,
  firstAddPlayer: true,

  addPlayer : async function () {
      if (this.firstAddPlayer) {
        this.firstAddPlayer = false
        this.elements.infoButton.style.display = 'block'
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
    this.updatePlayerList();
    this.checkPlayersAmount()
  },

  updatePlayerList: function() {
    this.elements.playerList.innerHTML = ''; // Clear the list first
    if (this.players.length > 0) {
      const title = document.createElement('p');
      title.textContent = 'Игроки:';
      this.elements.playerList.appendChild(title);
    }
    this.players.forEach(player => {
        this.elements.playerList.innerHTML += `<span class="playerList-item">${player.name}</span>`;
    });
  },

  checkPlayersAmount : function () {
      this.players.length >= 2 ? this.elements.startGameButton.style.display = 'block' : ''
  },

  showPlayerCards : function (playerNumber) {
      const player = this.players[playerNumber]
      let resultHTML = ''
      for (let cardsKey in player.cards) {
        resultHTML += `
          <div class="card card-hidden card-${cardsKey}">
            <p class="title">${player.cards[cardsKey].title}</p>
            <p class="description">${player.cards[cardsKey].description}</p>
            <p class="icon">${player.cards[cardsKey].icon}</p>
            <p class="category">${this.translateCategory(cardsKey)}</p>
          </div>
        `
      }
      this.elements.playerCards.innerHTML = resultHTML
      this.elements.playerCards.querySelectorAll('.card').forEach((card) => {
        let pressTimer = null;
        let longPress = false;

        const startPress = (e) => {
            if (this.cardsLocked) return;
            e.preventDefault(); // Prevent context menu on mobile
            longPress = false;
            pressTimer = setTimeout(() => {
                longPress = true;
                this.initiateCardSwap(player, card);
            }, 800); // 800ms for long press
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        card.addEventListener('mousedown', startPress);
        card.addEventListener('mouseup', cancelPress);
        card.addEventListener('mouseleave', cancelPress);
        card.addEventListener('touchstart', startPress, { passive: false });
        card.addEventListener('touchend', cancelPress);

        card.addEventListener('click', (e) => {
            if (this.cardsLocked) return;
            if (!longPress) {
                card.classList.toggle('card-hidden');
            }
        });
        card.addEventListener('dblclick', () => {
            if (this.cardsLocked) return;
            this.handleCardReplacement(player, card)
        });
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

  toggleLockCards: function() {
      this.cardsLocked = !this.cardsLocked;
      this.elements.lockCardsButton.innerHTML = this.cardsLocked ? '<span class="lockCardsButtonIcon">🔒</span>' : '<span class="lockCardsButtonIcon">🔓</span>';
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

    if (!categoryCards || categoryCards.length === 0) {
        this.wastedCardsAmount--; // Revert count if no card was picked
        return null;
    }
    
    const randomNumber = Math.floor(Math.random() * categoryCards.length)
    return categoryCards.splice(randomNumber, 1)[0]
  },

  translateCategory : function (category, plainText = false) {
    let categoryName = ''
    switch (category){
      case 'bunker':
        categoryName = plainText ? 'Бункер' : '<span style="color: #00b2ff; text-shadow: 0 0 3px rgb(0 217 255);">Бункер</span>'
        break
      case 'cataclysm':
        categoryName = plainText ? 'Катастрофа' : '<span style="color: #ff00fb; text-shadow: 0 0 3px rgb(238 0 255);">Катастрофа</span>'
        break
      case 'danger':
        categoryName = plainText ? 'Опасность' : '<span style="color: yellow; text-shadow: 0 0 3px rgb(255 221 0);">Опасность</span>'
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
