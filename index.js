const Game = {
    elements : {
      addPlayerButton : document.querySelector('.addPlayerButton'),
      startGameButton : document.querySelector('.startGameButton'),
      nextPlayerButton : document.querySelector('.nextPlayerButton'),
      currentPlayerName : document.querySelector('.currentPlayerName'),
      playerCards : document.querySelector('.playerCards'),
      commonToolbar: document.querySelector('.commonToolbar'),
      bunkerToolbarButton : document.querySelector('.bunkerToolbarButton'),
      cataclysmToolbarButton : document.querySelector('.cataclysmToolbarButton'),
      dangerToolbarButton : document.querySelector('.dangerToolbarButton'),
      commonCards: document.querySelector('.commonCards'),
  },

  addListeners: function () {
      this.elements.addPlayerButton.onclick = this.addPlayer.bind(this)
      this.elements.startGameButton.onclick = this.startGame.bind(this)
      this.elements.nextPlayerButton.onclick = this.nextPlayer.bind(this)
      this.elements.bunkerToolbarButton.onclick = this.pickBunkerCard.bind(this, 'bunker')
      this.elements.cataclysmToolbarButton.onclick = this.pickBunkerCard.bind(this, 'cataclysm')
      this.elements.dangerToolbarButton.onclick = this.pickBunkerCard.bind(this, 'danger')
  },

  startGame : function () {
      this.elements.addPlayerButton.style.display = 'none'
      this.elements.startGameButton.style.display = 'none'
      this.elements.nextPlayerButton.style.display = 'flex'
      this.elements.commonToolbar.style.display = 'block'
      this.elements.currentPlayerName.style.display = 'block'
      this.elements.commonCards.style.display = 'flex'
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

  players : [],
  currentPlayer : 0,

  addPlayer : function () {
    const newPlayer = {
      name: prompt('Укажите ваше имя:'),
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
        console.log(card)
        card.onclick = () => {
          card.classList.toggle('card-hidden')
        }
    })
      this.elements.currentPlayerName.innerHTML = player.name
  },

  nextPlayer : function () {
      this.currentPlayer++
      if (this.currentPlayer >= this.players.length) {
          this.currentPlayer = 0
      }
      this.elements.playerCards.innerHTML = ''
      setTimeout(() => { alert('Передайте устройство следующему игроку.') }, 10)
      setTimeout(() => { this.showPlayerCards(this.currentPlayer) }, 11)

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
        categoryName = 'Катастрофа'
        break
      case 'danger':
        categoryName = 'Опасность'
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




