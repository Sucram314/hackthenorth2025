"use client";
import { useState } from "react";

export default function Leaderboard({
  currentScore,
  currentTime,
  onScoreSubmitted,
}) {
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState([
    { name: "Player 1", score: 25, recordTime: "2025/09/12 14:30" },
    { name: "Player 2", score: 18, recordTime: "2025/09/11 16:45" },
    { name: "Player 3", score: 12, recordTime: "2025/09/10 10:20" },
    { name: "Player 4", score: 8, recordTime: "2025/09/09 18:15" },
    { name: "Player 5", score: 5, recordTime: "2025/09/08 12:00" },
    { name: "Player 52", score: 0, recordTime: "2025/09/07 09:30" },
    { name: "Player 53", score: 0, recordTime: "2025/09/06 15:45" },
    { name: "Player 53", score: 0, recordTime: "2025/09/05 11:20" },
    { name: "Player 53", score: 0, recordTime: "2025/09/04 13:10" },
    { name: "Player 53", score: 0, recordTime: "2025/09/03 17:25" },
    { name: "Player 53", score: 0, recordTime: "2025/09/02 14:50" },
    { name: "Player 53", score: 0, recordTime: "2025/09/01 16:30" },
    { name: "Player 53", score: 0, recordTime: "2025/08/31 10:15" },
    { name: "Player 53", score: 0, recordTime: "2025/08/30 12:40" },
    { name: "Player 53", score: 0, recordTime: "2025/08/29 19:05" },
  ]);

  const handleSubmit = () => {
    if (playerName.trim() && !submitted) {
      const currentDate = new Date();
      const formattedDate =
        currentTime ||
        `${currentDate.getFullYear()}/${String(
          currentDate.getMonth() + 1
        ).padStart(2, "0")}/${String(currentDate.getDate()).padStart(
          2,
          "0"
        )} ${String(currentDate.getHours()).padStart(2, "0")}:${String(
          currentDate.getMinutes()
        ).padStart(2, "0")}`;

      const newScore = {
        name: playerName.trim(),
        score: currentScore,
        recordTime: formattedDate,
      };
      const updatedScores = [...scores, newScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Keep top 10

      setScores(updatedScores);
      setSubmitted(true);
      if (onScoreSubmitted) {
        onScoreSubmitted(newScore);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `${rank}.`;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1:
        return "first-place";
      case 2:
        return "second-place";
      case 3:
        return "third-place";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2 className="leaderboard-title">🏆 LEADERBOARD 🏆</h2>
          <div className="leaderboard-subtitle">Top Players & High Scores</div>
        </div>

        <div className="leaderboard-content">
          <div className="scores-wrapper">
            <div className="scores-header">
              <div className="header-section rank-header">RANK</div>
              <div className="header-section name-header">PLAYER</div>
              <div className="header-section score-header">SCORE</div>
              <div className="header-section time-header">ACHIEVED</div>
            </div>

            <div className="scores-list">
              {scores.slice(0, 10).map((entry, index) => (
                <div
                  key={index}
                  className={`score-entry ${getRankClass(index + 1)}`}
                >
                  <div className="rank-section">
                    <span className="rank-icon">{getRankIcon(index + 1)}</span>
                  </div>
                  <div className="name-section">
                    <span className="player-name">{entry.name}</span>
                  </div>
                  <div className="score-section">
                    <span className="score-value">{entry.score}</span>
                    <span className="score-label">pts</span>
                  </div>
                  <div className="time-section">
                    <span className="time-value">{entry.recordTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
