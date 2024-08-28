import { useEffect, useRef, useState } from 'react';
import './App.css';

const COLS = 10
const ROWS = 20
const BLOCK_SIZE = 30
const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF']

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]]
]

type Piece = {
  shape: number[][],
  color: number,
  x: number,
  y: number
}

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  // const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
    let currentPiece: Piece = { shape: [[]], color: 0, x: 0, y: 0 }
    let animationId: number

    const drawBlock = (x: number, y: number, color: number) => {
      ctx.fillStyle = COLORS[color]
      ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
      ctx.strokeStyle = '#FFFFFF'
      ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
    }

    const drawBoard = () => {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          drawBlock(x, y, board[y][x])
        }
      }
    }

    const drawPiece = () => {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.color)
          }
        })
      })
    }

    const createPiece = () => {
      const shapeIndex = Math.floor(Math.random() * SHAPES.length)
      const colorIndex = Math.floor(Math.random() * (COLORS.length - 1)) + 1
      currentPiece = {
        shape: SHAPES[shapeIndex],
        color: colorIndex,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
        y: 0
      }
    }

    const isValidMove = (piece: typeof currentPiece, boardToCheck: number[][]) => {
      return piece.shape.every((row, dy) =>
        row.every((value, dx) =>
          value === 0 ||
          (piece.x + dx >= 0 &&
            piece.x + dx < COLS &&
            piece.y + dy < ROWS &&
            (boardToCheck[piece.y + dy] === undefined || boardToCheck[piece.y + dy][piece.x + dx] === 0))
        )
      )
    }

    const rotate = () => {
      const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
      )
      if (isValidMove({ ...currentPiece, shape: rotated }, board)) {
        currentPiece.shape = rotated
      }
    }

    const moveDown = () => {
      if (isValidMove({ ...currentPiece, y: currentPiece.y + 1 }, board)) {
        currentPiece.y++
      } else {
        mergePiece()
        createPiece()
        if (!isValidMove(currentPiece, board)) {
          setGameOver(true)
          cancelAnimationFrame(animationId)
        }
      }
    }

    const moveLeft = () => {
      if (isValidMove({ ...currentPiece, x: currentPiece.x - 1 }, board)) {
        currentPiece.x--
      }
    }

    const moveRight = () => {
      if (isValidMove({ ...currentPiece, x: currentPiece.x + 1 }, board)) {
        currentPiece.x++
      }
    }

    const mergePiece = () => {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color
          }
        })
      })
      clearLines()
    }

    const clearLines = () => {
      let linesCleared = 0
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
          board.splice(y, 1)
          board.unshift(Array(COLS).fill(0))
          linesCleared++
          y++
        }
      }
      if (linesCleared > 0) {
        setScore(prevScore => prevScore + linesCleared * 100)
      }
    }

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawBoard()
      drawPiece()
      animationId = requestAnimationFrame(update)
    }

    createPiece()
    update()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return
      switch (e.key) {
        case 'ArrowLeft':
          moveLeft()
          break
        case 'ArrowRight':
          moveRight()
          break
        case 'ArrowDown':
          moveDown()
          break
        case 'ArrowUp':
          rotate()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const gameLoop = setInterval(() => {
      if (!gameOver) {
        moveDown()
      }
    }, 1000)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(gameLoop)
      cancelAnimationFrame(animationId)
    }
  }, [gameOver]);

  const handleReset = () => {
    setScore(0)
    setGameOver(false)
  }

  const handlePause = () => {
    setIsPaused(true)
  };

  return (
    <div className={'container'}>
      <h1 className={'title'}>Tetris</h1>
      <div className={'gameArea'}>
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          className={'canvas'}
        />
        {gameOver && (
          <div className={'gameOver'}>
            <div className={'gameOverText'}>Game Over</div>
          </div>
        )}
      </div>
      <div className={'score'}>Score: {score}</div>
      <div className='controls'>
        <button title='Reset' onClick={handleReset}>Reset</button>
        <button title='Reset' onClick={handlePause}>Pause</button>
      </div>
    </div>
  )
}