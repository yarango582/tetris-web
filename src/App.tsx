import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Volume2, VolumeX, Play, Pause } from "lucide-react"
import level1 from "./assets/audios/level1.mp3"
import level2 from "./assets/audios/level2.mp3"
import level3 from "./assets/audios/level3.mp3"

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

const MUSIC_URLS = [
  level1,
  level2,
  level3
]

type Piece = {
  shape: number[][],
  color: number,
  x: number,
  y: number
}

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const boardRef = useRef(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)))
  const currentPieceRef = useRef<Piece>({ shape: [[]], color: 0, x: 0, y: 0 })
  const animationIdRef = useRef<number>()
  const dropIntervalRef = useRef<NodeJS.Timeout>()

  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: number) => {
    ctx.fillStyle = COLORS[color]
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
    ctx.strokeStyle = '#FFFFFF'
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
  }, [])

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D) => {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        drawBlock(ctx, x, y, boardRef.current[y][x])
      }
    }
  }, [drawBlock])

  const drawPiece = useCallback((ctx: CanvasRenderingContext2D) => {
    currentPieceRef.current.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(ctx, currentPieceRef.current.x + x, currentPieceRef.current.y + y, currentPieceRef.current.color)
        }
      })
    })
  }, [drawBlock])

  const createPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length)
    const colorIndex = Math.floor(Math.random() * (COLORS.length - 1)) + 1
    currentPieceRef.current = {
      shape: SHAPES[shapeIndex],
      color: colorIndex,
      x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
      y: 0
    }
  }, [])

  const isValidMove = useCallback((piece: Piece, board: number[][]) => {
    return piece.shape.every((row, dy) =>
      row.every((value, dx) =>
        value === 0 ||
        (piece.x + dx >= 0 &&
          piece.x + dx < COLS &&
          piece.y + dy < ROWS &&
          (board[piece.y + dy] === undefined || board[piece.y + dy][piece.x + dx] === 0))
      )
    )
  }, [])

  const rotate = useCallback(() => {
    const rotated = currentPieceRef.current.shape[0].map((_, i) =>
      currentPieceRef.current.shape.map(row => row[i]).reverse()
    )
    if (isValidMove({ ...currentPieceRef.current, shape: rotated }, boardRef.current)) {
      currentPieceRef.current.shape = rotated
    }
  }, [isValidMove])

  const moveDown = useCallback(() => {
    if (isValidMove({ ...currentPieceRef.current, y: currentPieceRef.current.y + 1 }, boardRef.current)) {
      currentPieceRef.current.y++
    } else {
      mergePiece()
      createPiece()
      if (!isValidMove(currentPieceRef.current, boardRef.current)) {
        setGameOver(true)
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [isValidMove, createPiece])

  const moveLeft = useCallback(() => {
    if (isValidMove({ ...currentPieceRef.current, x: currentPieceRef.current.x - 1 }, boardRef.current)) {
      currentPieceRef.current.x--
    }
  }, [isValidMove])

  const moveRight = useCallback(() => {
    if (isValidMove({ ...currentPieceRef.current, x: currentPieceRef.current.x + 1 }, boardRef.current)) {
      currentPieceRef.current.x++
    }
  }, [isValidMove])

  const mergePiece = useCallback(() => {
    currentPieceRef.current.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          boardRef.current[currentPieceRef.current.y + y][currentPieceRef.current.x + x] = currentPieceRef.current.color
        }
      })
    })
    clearLines()
  }, [])

  const clearLines = useCallback(() => {
    let linesCleared = 0
    boardRef.current = boardRef.current.reduce((acc, row) => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++
        acc.unshift(Array(COLS).fill(0))
      } else {
        acc.push(row)
      }
      return acc
    }, [] as number[][])

    if (linesCleared > 0) {
      setScore(prevScore => {
        const newScore = prevScore + linesCleared * 100
        if (Math.floor(newScore / 1000) > Math.floor(prevScore / 1000)) {
          setLevel(prevLevel => prevLevel + 1)
        }
        return newScore
      })
    }
  }, [])

  const update = useCallback(() => {
    if (!isPaused && !gameOver) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawBoard(ctx)
      drawPiece(ctx)
      animationIdRef.current = requestAnimationFrame(update)
    }
  }, [isPaused, gameOver, drawBoard, drawPiece])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameOver || isPaused) return
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
  }, [gameOver, isPaused, moveLeft, moveRight, moveDown, rotate])

  const updateDropInterval = useCallback(() => {
    if (dropIntervalRef.current) clearInterval(dropIntervalRef.current)
    dropIntervalRef.current = setInterval(() => {
      if (!isPaused && !gameOver) {
        moveDown()
      }
    }, Math.max(100, 1000 - (level - 1) * 100))
  }, [isPaused, gameOver, level, moveDown])

  useEffect(() => {
    createPiece()
    update()
    updateDropInterval()

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (dropIntervalRef.current) clearInterval(dropIntervalRef.current)
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    }
  }, [createPiece, update, updateDropInterval, handleKeyDown])

  useEffect(() => {
    updateDropInterval()
  }, [level, updateDropInterval])

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = MUSIC_URLS[(level - 1) % MUSIC_URLS.length];
    audio.loop = true;
    audio.volume = volume / 100;
    audio.muted = isMuted;

    const playAudio = () => {
      if (isMusicPlaying && !isPaused && !gameOver) {
        audio.play().catch(error => console.error("Audio playback failed:", error));
      } else {
        audio.pause();
      }
    };

    playAudio();

    return () => {
      audio.pause();
    };
  }, [level, isPaused, gameOver, isMuted, volume, isMusicPlaying]);

  const handleReset = useCallback(() => {
    boardRef.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
    setScore(0)
    setLevel(1)
    setGameOver(false)
    setIsPaused(false)
    createPiece()
    update()
    updateDropInterval()
  }, [createPiece, update, updateDropInterval])

  const handlePauseResume = useCallback(() => {
    setIsPaused(prev => !prev)
    if (isPaused) {
      update()
      updateDropInterval()
    }
  }, [isPaused, update, updateDropInterval])

  const handleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    setVolume(newVolume[0])
  }, [])

  // Touch events for mobile
  const touchStartRef = useRef({ x: 0, y: 0 })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gameOver || isPaused) return
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartRef.current.x
    const deltaY = touchEndY - touchStartRef.current.y

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 0) {
        moveRight()
      } else {
        moveLeft()
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        moveDown()
      } else {
        rotate()
      }
    }
  }, [gameOver, isPaused, moveRight, moveLeft, moveDown, rotate])

  const handleMusicToggle = () => {
    setIsMusicPlaying(!isMusicPlaying);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Tetris</h1>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          className="border-2 border-gray-300"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
        {(gameOver || isPaused) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-4xl font-bold">
              {gameOver ? 'Game Over' : 'Paused'}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 text-xl">Score: {score}</div>
      <div className="mt-2 text-xl">Level: {level}</div>
      <div className="mt-4 flex space-x-2">
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={handlePauseResume}>{isPaused ? 'Resume' : 'Pause'}</Button>
      </div>
      <div className="mt-4 flex items-center space-x-2">
        <Button size="icon" onClick={handleMute}>
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={handleVolumeChange}
          className="w-32"
        />
        <Button size="icon" onClick={handleMusicToggle}>
          {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
      <audio ref={audioRef} />
    </div>
  )
}