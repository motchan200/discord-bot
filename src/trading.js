// 取引・オークションシステム専用ファイル
import { 
  createTrade,
  buyTrade,
  cancelTrade,
  getActiveTrades,
  getUserTradeHistory,
  getTrade,
  createAuction,
  placeBid,
  endAuction,
  processExpiredAuctions,
  getActiveAuctions,
  getUserAuctionHistory,
  getAuction
} from './database.js';

// 取引システムの関数をエクスポート
export {
  createTrade,
  buyTrade,
  cancelTrade,
  getActiveTrades,
  getUserTradeHistory,
  getTrade
};

// オークションシステムの関数をエクスポート
export {
  createAuction,
  placeBid,
  endAuction,
  processExpiredAuctions,
  getActiveAuctions,
  getUserAuctionHistory,
  getAuction
};
