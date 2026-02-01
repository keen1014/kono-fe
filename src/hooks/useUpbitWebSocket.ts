import { useState, useEffect, useRef } from 'react';

interface TickerData {
  type: string;
  code: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  prev_closing_price: number;
  change: 'RISE' | 'EVEN' | 'FALL';
  change_price: number;
  signed_change_price: number;
  change_rate: number;
  signed_change_rate: number;
  trade_volume: number;
  acc_trade_volume_24h: number;
  acc_trade_price_24h: number;
  trade_date: string;
  trade_time: string;
  trade_timestamp: number;
  acc_ask_volume: number;
  acc_bid_volume: number;
  highest_52_week_price: number;
  highest_52_week_date: string;
  lowest_52_week_price: number;
  lowest_52_week_date: string;
  timestamp: number;
}

export function useUpbitWebSocket(symbols: string[] = ['BTC']) {
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);

  // 심볼이 변경될 때마다 의존성 배열에 문자열로 직렬화된 값을 사용
  const symbolsKey = JSON.stringify(symbols);

  useEffect(() => {
    // 심볼이 비어있으면 기본값으로 BTC 사용
    const symbolsToUse = symbols.length > 0 ? symbols : ['BTC'];

    socket.current = new WebSocket('wss://api.upbit.com/websocket/v1');
    // socket.current = new WebSocket('wss://api.playcono.com/ws/'); // 프록시 사용

    socket.current.onopen = function () {
      setIsConnected(true);
      setError(null);

      // 업비트 API 형식에 맞게 메시지 구성
      const message = [
        { ticket: 'test' },
        {
          type: 'ticker',
          codes: symbolsToUse.map((symbol) => `KRW-${symbol}`),
        },
      ];

      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify(message));
      }
    };

    socket.current.onmessage = function (event) {
      const reader = new FileReader();

      reader.onload = function () {
        try {
          const jsonData = JSON.parse(reader.result as string);

          if (jsonData && jsonData.code) {
            setTickerData((prevData) => ({
              ...prevData,
              [jsonData.code]: jsonData,
            }));
          }
        } catch (error) {
          console.error('JSON 파싱 오류:', error);
          console.error('원본 데이터:', reader.result);
        }
      };

      reader.readAsText(event.data);
    };

    socket.current.onerror = function (_error) {
      setError('웹소켓 연결 오류가 발생했습니다.');
      setIsConnected(false);
    };

    socket.current.onclose = function () {
      setIsConnected(false);
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [symbolsKey]); // symbolsKey를 의존성으로 사용

  return { tickerData, isConnected, error };
}

export default useUpbitWebSocket;
