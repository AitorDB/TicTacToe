'use strict'

const playerType = { human: 0, computer: 1 }
const boardSize = 3
const players = []

const stdin = process.stdin
const consoleOptions = {
  blackFg: '\x1b[30m',
  whiteBg: '\x1b[47m',
  reset: '\x1b[0m',
  cleanScreen: '\x1Bc'
}

const keys = {
  enter: '\u000D',
  arrowUp: '\u001B\u005B\u0041',
  arrowRight: '\u001B\u005B\u0043',
  arrowDown: '\u001B\u005B\u0042',
  arrowLeft: '\u001B\u005B\u0044',
  ctrlC: '\u0003'
}

stdin.setEncoding('utf8')

// Print a selection list
function printSelectionList (header, list, selectedOption) {
  console.log(consoleOptions.cleanScreen)
  console.log(header)
  console.log('-'.repeat(process.stdout.columns))

  for (let i = 0; i < list.length; i++) {
    if (i === selectedOption) {
      console.log(consoleOptions.blackFg +
        consoleOptions.whiteBg +
        list[selectedOption] +
        consoleOptions.reset)
    } else {
      console.log(list[i])
    }
  }
}

// Get the selected option from a list
function selectionList (header, list) {
  return new Promise((resolve) => {
    let selectedOption = 0

    stdin.setRawMode(true)
    stdin.resume()

    stdin.on('data', (data) => {
      switch (data) {
        // Enter
        case keys.enter:
          stdin.setRawMode(false)
          stdin.pause()
          stdin.removeAllListeners('data')
          resolve(selectedOption)
          break
        // Up
        case keys.arrowUp:
          selectedOption--
          break
        // Down
        case keys.arrowDown:
          selectedOption++
          break
        // Ctrl + C
        case keys.ctrlC:
          process.exit()
      }

      if (selectedOption >= list.length) selectedOption = 0
      else if (selectedOption < 0) selectedOption = list.length - 1

      printSelectionList(header, list, selectedOption)
    })

    printSelectionList(header, list, selectedOption)
  })
}

// Print a question and return the answer
function ask (question, errorMessage = null) {
  return new Promise((resolve) => {
    if (errorMessage !== null) {
      console.log(errorMessage)
    }
    console.log(question)
    stdin.resume()
    stdin.on('data', (data) => {
      stdin.removeAllListeners('data')
      stdin.pause()
      resolve(data.replace(/(\r)?\n$/, ''))
    })
  })
}

// Print a board and highlight a cell if indicated
function printBoard (board, { x, y } = { x: null, y: null }) {
  console.log(consoleOptions.cleanScreen)
  console.log('-------------')
  for (let i = 0; i < boardSize; i++) {
    let row = ''
    for (let j = 0; j < boardSize; j++) {
      row += '|'

      // Selected cell
      if (x === j && y === i) {
        row += consoleOptions.whiteBg // Set white background
        row += consoleOptions.blackFg // Set black font
        row += ` ${(board[i][j] !== null ? players[board[i][j]].symbol : '_')} `
        row += consoleOptions.reset // Reset colors
      } else {
        row += ` ${(board[i][j] !== null ? players[board[i][j]].symbol : ' ')} `
      }
    }

    row += '|'
    console.log(row)
    console.log('-------------')
  }
}

// Return an empty board
function generateBoard () {
  const board = []

  for (let i = 0; i < boardSize; i++) {
    const row = []
    for (let j = 0; j < boardSize; j++) {
      row.push(null)
    }

    board.push(row)
  }

  return board
}

// Return an array with the valid moves coordinates
function getValidMoves (board) {
  const validMoves = []

  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board[i][j] === null) validMoves.push({ x: j, y: i })
    }
  }

  return validMoves
}

// Get the winner if there is one or return -1
function getWinner (board) {
  const regex = new RegExp('^(.)\\1{' + (boardSize - 1) + '}$')

  // Check rows
  for (let i = 0; i < boardSize; i++) {
    if (board[i].join('').match(regex)) return board[i][0]
  }

  // Check columns
  for (let i = 0; i < boardSize; i++) {
    let column = []

    for (let j = 0; j < boardSize; j++) {
      column.push(board[j][i])
    }

    if (column.join('').match(regex)) return column[0]
  }

  // Check diagonal and anti-diagonal
  let diagonal = []
  let antiDiagonal = []

  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (i === j) diagonal.push(board[i][j])
      if (i === boardSize - j - 1) antiDiagonal.push(board[i][j])
    }
  }

  if (regex.test(diagonal.join(''))) return diagonal[0]
  else if (regex.test(antiDiagonal.join(''))) return antiDiagonal[0]

  return -1
}

// Minimax algorithm to get the best move
function minimax (board, player, maximizing = true, depth = 0) {
  const winner = getWinner(board)
  const availableMoves = getValidMoves(board)

  if (winner !== -1) {
    if ((maximizing && winner === player) || (!maximizing && winner !== player)) {
      return { value: 100 - depth, move: null }
    } else {
      return { value: -100 + depth, move: null }
    }
  } else if (winner === -1 && availableMoves.length === 0) {
    return { value: 0, move: null }
  }

  let bestValue = null
  let bestMove = null
  for (let i = 0; i < availableMoves.length; i++) {
    const move = availableMoves[i]
    let nextPlayer = player === 0 ? 1 : 0
    let childBoard = board.map((row) => [...row])
    childBoard[move.y][move.x] = player

    let { value } = minimax(childBoard, nextPlayer, !maximizing, depth + 1)

    if (bestValue === null || (bestValue < value && maximizing) || (bestValue > value && !maximizing)) {
      bestValue = value
      bestMove = move
    }
  }

  return { value: bestValue, move: bestMove }
}

// Request to select a free for the player
function humanTurn (board, player) {
  return new Promise((resolve) => {
    const position = {
      x: 0,
      y: 0
    }

    stdin.setRawMode(true)
    stdin.resume()

    stdin.on('data', (key) => {
      let showErrorMessage = false

      console.log(consoleOptions.cleanScreen)
      switch (key) {
        // Enter
        case keys.enter:
          if (board[position.y][position.x] === null) {
            stdin.setRawMode(false)
            stdin.pause()
            stdin.removeAllListeners('data')
            resolve(position)
          } else {
            showErrorMessage = true
          }
          break
        // Up
        case keys.arrowUp:
          position.y--
          break
        // Right
        case keys.arrowRight:
          position.x++
          break
        // Down
        case keys.arrowDown:
          position.y++
          break
        // Left
        case keys.arrowLeft:
          position.x--
          break
        // Ctrl + C
        case keys.ctrlC:
          process.exit()
      }

      if (position.y >= boardSize) position.y = 0
      else if (position.y < 0) position.y = boardSize - 1

      if (position.x >= boardSize) position.x = 0
      else if (position.x < 0) position.x = boardSize - 1

      printBoard(board, position)
      console.log(`${players[player].name} (${players[player].symbol}) turn`)
      if (showErrorMessage) console.log('That space is not free!')
    })

    printBoard(board, position)
    console.log(`${players[player].name} (${players[player].symbol}) turn`)
  })
}

// Initialize minimax function
function computerTurn (board, player) {
  printBoard(board)
  console.log(`${players[player].name} (${players[player].symbol}) turn`)

  return new Promise((resolve, reject) => {
    let result = minimax(board, player)

    setTimeout(() => { // Visual timeout
      resolve(result.move)
    }, 500)
  })
}

// Main function, start the game
async function game () {
  const board = generateBoard()

  // Main menu
  const menuOptions = [
    'Human vs human',
    'Human vs computer',
    'Computer vs computer'
  ]

  const menuHeader = 'Welcome to TIC TAC TOE! You can use the arrow keys and [ENTER] to choose the desired option. Good luck and have fun!'
  let gameMode = await selectionList(menuHeader, menuOptions)

  switch (gameMode) {
    // Human vs human
    case 0:
      players.push({ name: 'Player 1', symbol: null, type: playerType.human })
      players.push({ name: 'Player 2', symbol: null, type: playerType.human })
      break
    // Human vs computer
    case 1:
      players.push({ name: 'Player', symbol: null, type: playerType.human })
      players.push({ name: 'Computer', symbol: null, type: playerType.computer })
      break
    // Computer vs computer
    case 2:
      players.push({ name: 'Computer 1', symbol: null, type: playerType.computer })
      players.push({ name: 'Computer 2', symbol: null, type: playerType.computer })
      break
  }

  console.log(consoleOptions.cleanScreen)

  // Ask players symbol
  for (let i = 0; i < players.length; i++) {
    let question = `${players[i].name} symbol?`
    let symbol = null
    do {
      symbol = await ask(question)
      console.log(consoleOptions.cleanScreen)

      if (symbol.length !== 1) {
        console.log('The symbol must have a single character')
      }

      if (players.findIndex((player) => player.symbol === symbol) !== -1) {
        console.log('That symbol is already in use')
      }
    } while (symbol.length !== 1 || players.findIndex((player) => player.symbol === symbol) !== -1)

    players[i].symbol = symbol
  }

  // Ask who starts
  const header = 'Which player will start the game?'
  let turn = await selectionList(header, players.map((player) =>
    `${player.name} (${player.symbol})`))

  // Game
  let winner
  while ((winner = getWinner(board)) === -1 && getValidMoves(board).length > 0) {
    let position

    if (players[turn].type === playerType.human) {
      position = await humanTurn(board, turn)
    } else {
      position = await computerTurn(board, turn)
    }

    board[position.y][position.x] = turn
    turn++

    printBoard(board)

    if (turn >= players.length) {
      turn = 0
    }
  }

  printBoard(board)

  // Print game result
  if (winner === -1) {
    console.log('Draw')
  } else {
    console.log(`${players[winner].name} wins`)
  }
}

game()
