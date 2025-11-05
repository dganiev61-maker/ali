import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BIRDS_PER_LEVEL = 5;
const BIRD_EMOJIS = ['🦜', '🕊️', '🦢', '🦉', '🐧', '🐦', '🐥', '🦅', '🦆', '🦩', '🐔', '🦚'];
const LEVEL_DURATION = 30;

interface FreedBird {
    id: number;
    top: string;
    left: string;
    emoji: string;
}

interface LeaderboardEntry {
    name: string;
    score: number;
    level: number;
}

const App = () => {
    const [problem, setProblem] = useState({ a: 0, b: 0, operator: '+' });
    const [userAnswer, setUserAnswer] = useState('');
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState('');
    const [freedBirds, setFreedBirds] = useState<FreedBird[]>([]);
    const [birdsInCage, setBirdsInCage] = useState<string[]>([]);
    const [gameState, setGameState] = useState('startScreen'); // 'startScreen' | 'playing' | 'gameOver'
    const [level, setLevel] = useState(1);
    const [correctAnswersInLevel, setCorrectAnswersInLevel] = useState(0);
    const [timeLeft, setTimeLeft] = useState(LEVEL_DURATION);
    const [playerName, setPlayerName] = useState('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const birdSoundRef = useRef<HTMLAudioElement | null>(null);
    const ambientBirdsRef = useRef<HTMLAudioElement | null>(null);
    const wrongAnswerSoundRef = useRef<HTMLAudioElement | null>(null);
    const levelUpSoundRef = useRef<HTMLAudioElement | null>(null);
    const musicStarted = useRef(false);
    const answerInputRef = useRef<HTMLInputElement | null>(null);

    const generateBirds = (count: number): string[] => {
        return Array.from({ length: count }, () => BIRD_EMOJIS[Math.floor(Math.random() * BIRD_EMOJIS.length)]);
    };

    const generateProblem = (currentLevel = level) => {
        let a: number, b: number, operator: string;
    
        switch (true) {
            case currentLevel <= 2:
                a = Math.floor(Math.random() * 10) + 1;
                b = Math.floor(Math.random() * 10) + 1;
                operator = Math.random() > 0.5 ? '+' : '-';
                if (operator === '-' && a < b) [a, b] = [b, a];
                break;
            case currentLevel <= 4:
                a = Math.floor(Math.random() * 20) + 5;
                b = Math.floor(Math.random() * 20) + 5;
                operator = Math.random() > 0.5 ? '+' : '-';
                if (operator === '-' && a < b) [a, b] = [b, a];
                break;
            case currentLevel <= 6:
                operator = ['+', '-', '*'][Math.floor(Math.random() * 3)];
                if (operator === '*') {
                    a = Math.floor(Math.random() * 9) + 2; // 2-10
                    b = Math.floor(Math.random() * 9) + 2;
                } else {
                    a = Math.floor(Math.random() * 50) + 20;
                    b = Math.floor(Math.random() * 50) + 20;
                    if (operator === '-' && a < b) [a, b] = [b, a];
                }
                break;
            default: // Level 7+
                operator = ['+', '-', '*'][Math.floor(Math.random() * 3)];
                if (operator === '*') {
                    a = Math.floor(Math.random() * (5 + currentLevel)) + 2;
                    b = Math.floor(Math.random() * 10) + 2;
                } else {
                    a = Math.floor(Math.random() * (10 * currentLevel)) + 20;
                    b = Math.floor(Math.random() * (10 * currentLevel)) + 20;
                    if (operator === '-' && a < b) [a, b] = [b, a];
                }
                break;
        }
        setProblem({ a, b, operator });
    };

    useEffect(() => {
        setBirdsInCage(generateBirds(BIRDS_PER_LEVEL));
        generateProblem(1);
        bgMusicRef.current = document.getElementById('bg-music') as HTMLAudioElement;
        birdSoundRef.current = document.getElementById('bird-sound') as HTMLAudioElement;
        ambientBirdsRef.current = document.getElementById('ambient-birds') as HTMLAudioElement;
        wrongAnswerSoundRef.current = document.getElementById('wrong-answer-sound') as HTMLAudioElement;
        levelUpSoundRef.current = document.getElementById('level-up-sound') as HTMLAudioElement;

        const storedLeaderboard = localStorage.getItem('birdGameLeaderboard');
        if (storedLeaderboard) {
            setLeaderboard(JSON.parse(storedLeaderboard));
        }

        if(bgMusicRef.current) bgMusicRef.current.volume = 0.3;
        if(ambientBirdsRef.current) ambientBirdsRef.current.volume = 0.4;
        
        document.body.className = 'level-bg-1';
    }, []);

    useEffect(() => {
        let backgroundLevel = 1;
        if (level >= 3) backgroundLevel = 2;
        if (level >= 5) backgroundLevel = 3;
        if (level >= 7) backgroundLevel = 4;
        
        document.body.className = ''; // Reset classes
        document.body.classList.add(`level-bg-${backgroundLevel}`);
    }, [level]);
    
    const saveScore = (name: string, finalScore: number, finalLevel: number) => {
        const newScore = { name, score: finalScore, level: finalLevel };
        const updatedLeaderboard = [...leaderboard, newScore]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Keep top 10
        setLeaderboard(updatedLeaderboard);
        localStorage.setItem('birdGameLeaderboard', JSON.stringify(updatedLeaderboard));
    };

    useEffect(() => {
        if (gameState !== 'playing') {
            return;
        }
        
        setTimeLeft(LEVEL_DURATION); // Reset timer on level change

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timerId);
                    setMessage('Время вышло! Игра окончена.');
                    setGameState('gameOver');
                    saveScore(playerName, score, level);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [level, gameState, playerName, score]);


    const startMusic = () => {
        if (!musicStarted.current) {
             if (bgMusicRef.current) {
                bgMusicRef.current.play().catch(error => {
                    console.log("Воспроизведение музыки заблокировано браузером.");
                });
            }
            if (ambientBirdsRef.current) {
                ambientBirdsRef.current.play().catch(error => {
                     console.log("Воспроизведение фоновых звуков заблокировано браузером.");
                });
            }
            musicStarted.current = true;
        }
    };
    
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (gameState !== 'playing') return;

        let correctAnswer;
        if(problem.operator === '+') correctAnswer = problem.a + problem.b;
        else if(problem.operator === '-') correctAnswer = problem.a - problem.b;
        else correctAnswer = problem.a * problem.b;

        if (parseInt(userAnswer, 10) === correctAnswer) {
            setScore(score + 1);
            
            if (birdSoundRef.current) {
                birdSoundRef.current.currentTime = 0;
                birdSoundRef.current.play();
            }

            setFreedBirds(prevBirds => [...prevBirds, {
                id: Date.now() + Math.random(),
                top: `70%`,
                left: `50%`,
                emoji: birdsInCage[birdsInCage.length - 1]
            }]);
            
            setBirdsInCage(prev => prev.slice(0, prev.length - 1));
            
            const newCorrectAnswers = correctAnswersInLevel + 1;

            if (newCorrectAnswers === BIRDS_PER_LEVEL) {
                const nextLevel = level + 1;
                setMessage(`Уровень ${level} пройден!`);
                if (levelUpSoundRef.current) {
                    levelUpSoundRef.current.play();
                }
                setTimeout(() => {
                    setLevel(nextLevel);
                    setCorrectAnswersInLevel(0);
                    setBirdsInCage(generateBirds(BIRDS_PER_LEVEL));
                    generateProblem(nextLevel);
                    setMessage('');
                }, 2000);
            } else {
                setCorrectAnswersInLevel(newCorrectAnswers);
                generateProblem();
            }
        } else {
            if (wrongAnswerSoundRef.current) {
                wrongAnswerSoundRef.current.play();
            }
            setMessage('Ошибка! Игра окончена.');
            setGameState('gameOver');
            saveScore(playerName, score, level);
        }
        setUserAnswer('');
        answerInputRef.current?.focus();
    };

    const handleStartGame = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (playerName.trim()) {
            setGameState('playing');
            startMusic();
            setTimeout(() => answerInputRef.current?.focus(), 0);
        }
    };

    const restartGame = () => {
        setGameState('playing');
        setScore(0);
        setLevel(1);
        setCorrectAnswersInLevel(0);
        setFreedBirds([]);
        setBirdsInCage(generateBirds(BIRDS_PER_LEVEL));
        generateProblem(1);
        setMessage('');
        document.body.className = 'level-bg-1';
        setTimeout(() => answerInputRef.current?.focus(), 0);
    };

    const cageLevel = (level - 1) % 4 + 1;

    return (
        <>
            {freedBirds.map(bird => (
                <div key={bird.id} className="bird" style={{ top: bird.top, left: bird.left }}>
                    {bird.emoji}
                </div>
            ))}

            <div className="main-layout">
                 {gameState === 'startScreen' && (
                    <div className="start-screen-container">
                        <h1>Спаси птиц</h1>
                        <p>Введите ваше имя, чтобы начать</p>
                        <form onSubmit={handleStartGame}>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="name-input"
                                placeholder="Имя игрока"
                                autoFocus
                                required
                                maxLength={15}
                            />
                            <button type="submit" className="start-button">Начать игру</button>
                        </form>
                    </div>
                )}
                
                {(gameState === 'playing' || gameState === 'gameOver') && (
                    <>
                        <div className="game-area">
                            {gameState === 'gameOver' && (
                                <div className="game-over-container">
                                    <h1>Игра окончена</h1>
                                    <p>{message}</p>
                                    <p>Игрок: {playerName}</p>
                                    <p>Ваш итоговый счет: {score}</p>
                                    <p>Вы достигли уровня: {level}</p>
                                    <button className="restart-button" onClick={restartGame}>
                                        Начать заново
                                    </button>
                                </div>
                            )}

                            {gameState === 'playing' && (
                                <div className="game-wrapper">
                                    <div className={`cage-container cage-level-${cageLevel}`}>
                                        <div className="birds-inside">
                                            {birdsInCage.map((bird, index) => (
                                                <span key={index} className="bird-in-cage">{bird}</span>
                                            ))}
                                        </div>
                                        <div className="cage-bars"></div>
                                    </div>

                                    <div className="game-container">
                                        <div className="game-stats">
                                            <span>Счет: {score}</span>
                                            <span className="timer">Время: {timeLeft}</span>
                                            <span>Уровень: {level}</span>
                                        </div>
                                        <h1>Спаси птиц</h1>
                                        <div className={`message ${message.includes('пройден') ? 'correct' : ''}`}>
                                            {message}
                                        </div>
                                        <div className="problem">
                                            {problem.a} {problem.operator} {problem.b} = ?
                                        </div>
                                        <form onSubmit={handleSubmit}>
                                            <input
                                                ref={answerInputRef}
                                                type="number"
                                                value={userAnswer}
                                                onChange={(e) => setUserAnswer(e.target.value)}
                                                className="answer-input"
                                                autoFocus
                                                required
                                            />
                                            <button type="submit" className="submit-button">Ответ</button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="leaderboard-container">
                            <h2>🏆 Рейтинг 🏆</h2>
                            <ol>
                                {leaderboard.length > 0 ? leaderboard.map((entry, index) => (
                                    <li key={index} className={entry.name === playerName && score === entry.score ? 'current-player' : ''}>
                                        <span>{entry.name}</span>
                                        <span>{entry.score} (Ур: {entry.level})</span>
                                    </li>
                                )) : <p>Пока нет рекордов!</p>}
                            </ol>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);