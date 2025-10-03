// ユーティリティ関数集
import { 
  rollGacha, 
  rollMultipleGacha, 
  rollApologyGacha,
  startBlackjackGame,
  hitCard,
  standCard,
  getGameState,
  endGame,
  getActiveGame,
  getBlackjackHistory,
  startBaccaratGame,
  getBaccaratHistory,
  startSicboGame,
  getSicboHistory,
  getAvailableBetTypes,
  startSlotGame,
  spinAllReels,
  calculatePayout,
  changeBetAmount,
  getSlotGameState,
  endSlotGame,
  getActiveSlotGame,
  formatReels
} from './games.js';

// ゲーム関連のユーティリティ関数をエクスポート
export {
  rollGacha,
  rollMultipleGacha,
  rollApologyGacha,
  startBlackjackGame,
  hitCard,
  standCard,
  getGameState,
  endGame,
  getActiveGame,
  getBlackjackHistory,
  startBaccaratGame,
  getBaccaratHistory,
  startSicboGame,
  getSicboHistory,
  getAvailableBetTypes,
  startSlotGame,
  spinAllReels,
  calculatePayout,
  changeBetAmount,
  getSlotGameState,
  endSlotGame,
  getActiveSlotGame,
  formatReels
};

// その他のユーティリティ関数
export function formatNumber(num) {
  return num.toLocaleString();
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('ja-JP');
}

export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}時間${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeString(str) {
  return str.replace(/[<>\"'&]/g, (match) => {
    const escapeMap = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escapeMap[match];
  });
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
