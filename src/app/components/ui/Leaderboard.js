"use client";
import { useState, useEffect } from "react";
import { getTopScores, addScore } from "../../services/db";

export default function Leaderboard() {

  // Load initial leaderboard data
  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await getTopScores(50);
      if (result.success) {
        setScores(result.data);
      } else {
        console.error('Failed to load leaderboard:', result.error);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
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
              {scores.slice(0, 50).map((entry, index) => (
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
