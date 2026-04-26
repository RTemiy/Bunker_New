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
      playerList: document.querySelector('.playerList'),
      infoButton: document.querySelector('.infoButton'),
      lockCardsButton: document.querySelector('.lockCardsButton'),
      modalOverlay: document.querySelector('#modal-overlay'),
      modalWindow: document.querySelector('#modal-window'),
      modalTitle: document.querySelector('#modal-title'),
      modalContent: document.querySelector('#modal-content'),
      modalActions: document.querySelector('#modal-actions'),
      menuButton: document.querySelector('.menuButton'),
      categorySelection: document.querySelector('#category-selection'),
      categoryCheckboxes: document.querySelector('#category-checkboxes'),
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
      this.elements.infoButton.onclick = this.showInfo.bind(this)
      this.elements.lockCardsButton.onclick = this.toggleLockCards.bind(this)
      this.elements.menuButton.onclick = this.showGameMenu.bind(this)
  },

  // --- Custom Modal Logic ---
  isModalOpen: false,
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
          // We don't hide the modal here anymore, the calling function decides.
          if (inputElement) {
            resolve(buttonConfig.resolves !== null ? inputElement.value : null);
          } else {
            resolve(buttonConfig.resolves);
          }
        };
        if (buttonConfig.className) {
            button.className = buttonConfig.className;
        }
        this.elements.modalActions.appendChild(button);
      });

      if (!this.isModalOpen) {
        this.isModalOpen = true;
        this.elements.modalOverlay.style.display = 'flex';
        setTimeout(() => this.elements.modalOverlay.classList.add('visible'), 10);
      }

      if (inputElement) {
        inputElement.focus();
      }
    });
  },

  hideModal: function() {
    this.isModalOpen = false;
    this.elements.modalOverlay.classList.remove('visible');
    setTimeout(() => {
      this.elements.modalOverlay.style.display = 'none';
    }, 300); // Corresponds to CSS transition duration
  },

  // --- Replaced alert/prompt functions ---
  showAlert: function(title, message) {
    const promise = this.showModal({
      title: title,
      message: message,
      buttons: [{ text: 'OK', resolves: true }]
    });
    promise.then(() => this.hideModal());
    return promise;
  },

  showPrompt: function(title, placeholder) {
    const promise = this.showModal({
      title: title,
      prompt: true,
      placeholder: placeholder,
      buttons: [{ text: 'OK', resolves: true }]
    });
    promise.then(() => this.hideModal());
    return promise;
  },

  showConfirmation: function(title, message) {
    const promise = this.showModal({
      title: title,
      message: message,
      buttons: [
        { text: 'Да', resolves: true },
        { text: 'Нет', resolves: false }
      ]
    });
    promise.then(() => this.hideModal());
    return promise;
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

    if (targetPlayerIndex === null) {
      this.hideModal(); // Закрываем модальное окно при отмене
      return;
    }

    this.hideModal();
    const targetPlayer = this.players[targetPlayerIndex];

    // Swap cards in the data model
    const cardToGive = currentPlayer.cards[category];
    const cardToReceive = targetPlayer.cards[category];

    currentPlayer.cards[category] = cardToReceive;
    // Also swap marked status
    const markedToGive = currentPlayer.markedCards[category];
    const markedToReceive = targetPlayer.markedCards[category];
    currentPlayer.markedCards[category] = markedToReceive;
    targetPlayer.markedCards[category] = markedToGive;

    targetPlayer.cards[category] = cardToGive;
    this.showPlayerCards(this.currentPlayer);
  },

  showCardActionModal: async function(currentPlayer, cardElement) {
    const categoryClass = Array.from(cardElement.classList).find(c => c.startsWith('card-') && c !== 'card-hidden' && c !== 'card-flash' && c !== 'card-marked');
    if (!categoryClass) return;
    const category = categoryClass.replace('card-', '');

    const action = await this.showModal({
      title: `Действие с картой "${this.translateCategory(category, true)}"`,
      message: 'Что вы хотите сделать?',
      buttons: [
        { text: 'Отметить', resolves: 'mark' },
        { text: 'Заменить', resolves: 'replace' },
        { text: 'Обменять', resolves: 'swap' },
        { text: 'Отмена', resolves: null }
      ]
    });

    if (action === 'mark') {
      this.toggleCardMark(currentPlayer, cardElement, category);
      this.hideModal();
    } else if (action === 'replace') {
      await this.handleCardReplacement(currentPlayer, cardElement);
    } else if (action === 'swap') {
      await this.initiateCardSwap(currentPlayer, cardElement);
    } else {
      this.hideModal(); // Hide only if "Отмена" was pressed
    }
  },

  showGameMenu: async function() {
    const action = await this.showModal({
      title: 'Меню игры',
      buttons: [
        { text: 'Новый раунд', resolves: 'new_round' },
        { text: 'Новая игра', resolves: 'hard_reset', className: 'hard-reset-button' },
        { text: 'Отмена', resolves: null }
      ]
    });

    if (action === 'new_round') {
      this.confirmNewGame();
    } else if (action === 'hard_reset') {
      const confirmed = await this.showModal({
        title: 'Начать с нуля?',
        message: 'Вы уверены? Все игроки и прогресс будут удалены. Это действие нельзя отменить.',
        buttons: [{ text: 'Да', resolves: true }, { text: 'Нет', resolves: false }]
      });
      if (confirmed) {
        localStorage.removeItem('bunkerGameState');
        location.reload();
      } else { this.hideModal(); } // Hide only if "Нет" was pressed
    } else {
      this.hideModal();
    }
  },

  showInfo: function () {
    const message = `- Карт в колоде: ${this.allCardsAmount - this.wastedCardsAmount}/${this.allCardsAmount}\n- Всего игроков: ${this.players.length}`;
    this.showAlert('Информация', message);
  },

  // --- Card Actions ---
  async handleCardReplacement(player, cardElement) {
    const categoryClass = Array.from(cardElement.classList).find(c => c.startsWith('card-') && c !== 'card-hidden' && c !== 'card-flash' && c !== 'card-marked');
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
      this.elements.playerList.style.display = 'none'
      this.elements.categorySelection.style.display = 'none';
      this.elements.startGameButton.style.display = 'none'
      this.elements.showCardsButton.style.display = 'none'
      this.elements.nextPlayerButton.style.display = 'flex'
      this.elements.previousPlayerButton.style.display = 'flex'
      this.elements.commonToolbar.style.display = 'block'
      this.elements.currentPlayerName.style.display = 'block'
      this.elements.commonCards.style.display = 'flex'
      this.elements.menuButton.style.display = 'block'
      this.elements.lockCardsButton.style.display = 'block'
      this.showPlayerCards(this.currentPlayer)
  },

  pickBunkerCard: function (category) {
      const cardPicked = this.pickRandom('bunker', category)
      if (!cardPicked) return; // No more cards
      this.shownCommonCards.push({ ...cardPicked, category });
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
      this.shownCommonCards = [];
      // Re-deal cards for all players based on active categories
      this.players.forEach((player) => {
        for (const category in this.activeCategories) {
          if (this.activeCategories[category])
            player.cards[category] = this.pickRandom('player', category);
            player.markedCards[category] = false; // Сбрасываем отметки
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
  shownCommonCards: [],
  activeCategories: {},

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
      cards: {},
      markedCards: {} // Для отслеживания показанных карт
    }
    for (let category in this.activeCategories) {
      if (this.activeCategories[category]) {
        newPlayer.cards[category] = this.pickRandom('player', category);
        newPlayer.markedCards[category] = false;
      }
    }
    this.players.push(newPlayer)
    this.updatePlayerList();
    this.elements.menuButton.style.display = 'block'; // Show menu after first player is added
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
        const isMarked = player.markedCards[cardsKey];
        resultHTML += `
          <div class="card card-hidden card-${cardsKey} ${isMarked ? 'card-marked' : ''}">
            <p class="title">${player.cards[cardsKey].title}</p>
            <p class="description">${player.cards[cardsKey].description}</p>
            <p class="icon">${player.cards[cardsKey].icon}</p>
            <p class="category" data-category="${cardsKey}">${this.translateCategory(cardsKey)}</p>
          </div>
        `
      }
      this.elements.playerCards.innerHTML = resultHTML

      this.elements.playerCards.querySelectorAll('.card').forEach((card) => {
        let pressTimer;
        let lastTapTime = 0;

        card.addEventListener('pointerup', (e) => {
          e.preventDefault();
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTapTime;

          if (tapLength < 300 && tapLength > 0) {
            // Double tap
            clearTimeout(pressTimer); // Отменяем таймер одиночного клика
            if (!this.cardsLocked) {
              this.showCardActionModal(player, card);
            }
            lastTapTime = 0; // Сбрасываем время для следующего дабл-клика
          } else {
            // Single tap
            pressTimer = setTimeout(() => {
              if (!this.cardsLocked) {
                card.classList.toggle('card-hidden');
              }
            }, 300); // Ждем 300мс, чтобы убедиться, что это не дабл-клик
          }

          lastTapTime = currentTime;
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

  toggleCardMark: function(player, cardElement, category) {
    if (this.cardsLocked) return;
    // Обновляем состояние в данных игрока и переключаем CSS-класс
    player.markedCards[category] = !player.markedCards[category];
    cardElement.classList.toggle('card-marked');
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

  populateCategorySelection: function() {
    this.elements.categoryCheckboxes.innerHTML = '';
    for (const category in this.allPlayerCards) {
      // By default, all categories are active
      if (this.activeCategories[category] === undefined) {
        this.activeCategories[category] = true;
      }

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.activeCategories[category];
      checkbox.dataset.category = category;

      checkbox.onchange = (e) => {
        this.activeCategories[e.target.dataset.category] = e.target.checked;
      };

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(this.translateCategory(category, true)));
      this.elements.categoryCheckboxes.appendChild(label);
    }
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
        this.populateCategorySelection(); // Populate checkboxes as cards load
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

  // --- Game State Persistence ---
  saveGameState: function() {
    if (this.players.length === 0) {
        localStorage.removeItem('bunkerGameState');
        return;
    }
    const state = {
      players: this.players,
      currentPlayer: this.currentPlayer,
      allPlayerCards: this.allPlayerCards,
      allBunkerCards: this.allBunkerCards,
      wastedCardsAmount: this.wastedCardsAmount,
      cardsLocked: this.cardsLocked,
      firstAddPlayer: this.firstAddPlayer,
      shownCommonCards: this.shownCommonCards,
      activeCategories: this.activeCategories,
      gameStarted: this.elements.startGameButton.style.display === 'none' && this.players.length > 0
    };
    localStorage.setItem('bunkerGameState', JSON.stringify(state));
  },

  loadGameState: function() {
    const savedState = localStorage.getItem('bunkerGameState');
    if (!savedState) return;

    try {
      const state = JSON.parse(savedState);

      // Restore data
      this.players = state.players;
      this.currentPlayer = state.currentPlayer;
      this.allPlayerCards = state.allPlayerCards;
      this.allBunkerCards = state.allBunkerCards;
      this.wastedCardsAmount = state.wastedCardsAmount;
      this.cardsLocked = state.cardsLocked;
      this.firstAddPlayer = state.firstAddPlayer;
      this.shownCommonCards = state.shownCommonCards || [];
      this.activeCategories = state.activeCategories || {};

      // Restore UI
      this.updatePlayerList();
      this.toggleLockCards(); // To set the icon correctly
      this.toggleLockCards(); // Call it twice to revert to original state but update UI

      if (state.gameStarted) {
        // Game was in progress
        this.elements.addPlayerButton.style.display = 'none';
        this.elements.startGameButton.style.display = 'none';
        this.elements.categorySelection.style.display = 'none';
        this.elements.showCardsButton.style.display = 'none';
        this.elements.playerList.style.display = 'none';
        this.elements.infoButton.style.display = 'block';

        this.elements.nextPlayerButton.style.display = 'flex';
        this.elements.previousPlayerButton.style.display = 'flex';
        this.elements.commonToolbar.style.display = 'block';
        this.elements.currentPlayerName.style.display = 'block';
        this.elements.commonCards.style.display = 'flex'; 
        this.elements.menuButton.style.display = 'block';
        this.elements.lockCardsButton.style.display = 'block';

        // Re-render common cards
        this.elements.commonCards.innerHTML = '';
        this.shownCommonCards.forEach(card => {
            this.elements.commonCards.innerHTML += `
                <div class="card">
                    <p class="title">${card.title}</p>
                    <p class="description">${card.description}</p>
                    <p class="icon">${card.icon}</p>
                    <p class="category">${this.translateCategory(card.category)}</p>
                </div>
            `;
        });

        this.showPlayerCards(this.currentPlayer);
      } else {
        // Game was not started, just players added
        this.elements.infoButton.style.display = 'block';
        this.elements.menuButton.style.display = 'block';
        this.elements.categorySelection.style.display = 'block';
        this.populateCategorySelection();
        this.checkPlayersAmount();
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
      localStorage.removeItem('bunkerGameState'); // Clear corrupted data
    }
  },


  init: function () {
    const savedState = localStorage.getItem('bunkerGameState');
    if (savedState) {
        this.loadGameState();
        this.addListeners();
        // Start autosave if game is loaded
        setInterval(this.saveGameState.bind(this), 10000);
    } else {
        this.initCards();
        this.addListeners();
        // Show category selection for a new game from the start
        this.elements.categorySelection.style.display = 'block';
        // Start autosave for a new game
        setInterval(this.saveGameState.bind(this), 10000);
    }
  }
}

Game.init()
