import { useState, useEffect, useRef } from 'react';
import Header from '../components/layout/Header';
import { getRanksAllMe, getRanksDaily, getRanksDailyMe } from '../api/ranking';
import { getRanksAll } from '../api/ranking';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/formatter';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css'; // 블러 효과 스타일 (선택사항)

interface Rank {
  nickname: string;
  profileImageUrl: string;
  badgeImageUrl?: string;
  profit?: number;
  profitRate?: number;
  rank: number;
  updatedAt: string;
}

type RankingPeriod = '일간' | '전체';

export default function Ranking() {
  const [activePeriod, setActivePeriod] = useState<RankingPeriod>('일간');
  const [myUserSticky, setMyUserSticky] = useState<'bottom' | 'top' | null>(
    null,
  );
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [myRank, setMyRank] = useState<Rank | null>(null);
  const [ranksDaily, setRanksDaily] = useState<Rank[]>([]);
  const [myRankDaily, setMyRankDaily] = useState<Rank | null>(null);
  const [dailyUpdatedAt, setDailyUpdatedAt] = useState<string>('');
  const [allUpdatedAt, setAllUpdatedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const myUserRef = useRef<HTMLDivElement>(null);

  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5분
  const PLACEHOLDER = 'https://static.upbit.com/logos/BTC.png';

  // 퍼센트 표시 형식화 함수
  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return '0.00%';

    // 절대 값이 0인 경우 부호 없이 표시
    if (value === 0) return '0.00%';

    // 부호 추가 및 소수점 두 자리로 고정
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // 이미지 URL 최적화 함수 (선택사항)
  const optimizeImageUrl = (url: string) => {
    if (!url || !url.includes('kakaocdn')) return url;
    return url.replace('R640x640', 'R160x160'); // 더 작은 이미지 요청
  };

  // 랭킹 데이터 가져오기
  const fetchRanks = async () => {
    setIsLoading(true);
    try {
      const [dailyRanks, allRanks, myRankData, myRankDailyData] =
        await Promise.all([
          getRanksDaily(),
          getRanksAll(),
          getRanksAllMe(),
          getRanksDailyMe(),
        ]);

      setRanks(allRanks);
      setRanksDaily(dailyRanks);
      setMyRank(myRankData?.[0] || null);
      setMyRankDaily(myRankDailyData?.[0] || null);
      setDailyUpdatedAt(dailyRanks[0].updatedAt);
      setAllUpdatedAt(allRanks[0].updatedAt);
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 데이터 로드 및 5분마다 새로고침
  useEffect(() => {
    fetchRanks();
    const intervalId = setInterval(fetchRanks, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!myUserRef.current) return;

      const rect = myUserRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.bottom > windowHeight) {
        // 내 순위가 화면 아래로 벗어나면 top-0으로 고정
        setMyUserSticky('top');
      } else if (rect.top < 0) {
        // 내 순위가 화면 위로 벗어나면 bottom-0으로 고정
        setMyUserSticky('bottom');
      } else {
        // 화면 안에 있으면 고정 해제
        setMyUserSticky(null);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 현재 활성화된 기간에 따른 랭킹 데이터
  const currentRanks = activePeriod === '일간' ? ranksDaily : ranks;
  const currentMyRank = activePeriod === '일간' ? myRankDaily : myRank;

  // 상위 3명과 나머지 유저 분리
  const topUsers = currentRanks.slice(0, 3);
  const otherUsers = currentRanks.slice(3);

  if (isLoading && currentRanks.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="랭킹" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="랭킹" />

      {/* 기간 선택 탭 */}
      <div className="mx-4 mt-4 flex border-b bg-white sticky top-0 z-10 rounded-t-xl dark:bg-gray-800 dark:text-white dark:border-gray-700">
        {(['일간', '전체'] as RankingPeriod[]).map((period) => (
          <button
            key={period}
            className={`flex-1 py-3 text-center ${
              activePeriod === period
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500'
            }`}
            onClick={() => setActivePeriod(period)}
          >
            {period}
          </button>
        ))}
      </div>

      {/* 상위 3명 */}
      <div className="bg-white p-4 py-6 rounded-b-xl mb-4 dark:bg-gray-800 dark:text-white mx-4 shadow-md">
        <div className="flex justify-around items-end">
          {/* 2등 */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <LazyLoadImage
                src={optimizeImageUrl(topUsers[1]?.profileImageUrl || PLACEHOLDER)}
                alt={topUsers[1]?.nickname || 'User'}
                className="w-16 h-16 rounded-full border-2 border-gray-300 object-cover"
                onError={(e: any) => {
                  (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                }}
                placeholderSrc={PLACEHOLDER}
                effect="blur"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-lg font-bold">
                2
              </div>
            </div>
            <div className="mt-2 font-medium">{topUsers[1]?.nickname}</div>
            <div
              className={`text-xs ${
                activePeriod === '일간'
                  ? (topUsers[1]?.profitRate ?? 0) === 0
                    ? 'text-gray-500'
                    : (topUsers[1]?.profitRate ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
                  : (topUsers[1]?.profit ?? 0) === 0
                    ? 'text-gray-500'
                    : (topUsers[1]?.profit ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
              }`}
            >
              {activePeriod === '일간'
                ? formatPercentage(topUsers[1]?.profitRate)
                : `${(topUsers[1]?.profit ?? 0) > 0 ? '+' : (topUsers[1]?.profit ?? 0) < 0 ? '-' : ''}${formatCurrency(Math.abs(topUsers[1]?.profit ?? 0))}`}
            </div>
          </div>

          {/* 1등 */}
          <div className="flex flex-col items-center -mt-4 ">
            <div className="relative">
              <LazyLoadImage
                src={optimizeImageUrl(topUsers[0]?.profileImageUrl || PLACEHOLDER)}
                alt={topUsers[0]?.nickname || 'User'}
                className="w-20 h-20 rounded-full border-2 border-yellow-400 object-cover"
                onError={(e: any) => {
                  (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                }}
                placeholderSrc={PLACEHOLDER}
                effect="blur"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-lg font-bold">
                1
              </div>
            </div>
            <div className="mt-2 font-medium">{topUsers[0]?.nickname}</div>
            <div
              className={`text-xs ${
                activePeriod === '일간'
                  ? (topUsers[0]?.profitRate ?? 0) === 0
                    ? 'text-gray-500'
                    : (topUsers[0]?.profitRate ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
                  : (topUsers[0]?.profit ?? 0) === 0
                    ? 'text-gray-500'
                    : (topUsers[0]?.profit ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
              }`}
            >
              {activePeriod === '일간'
                ? formatPercentage(topUsers[0]?.profitRate)
                : `${(topUsers[0]?.profit ?? 0) > 0 ? '+' : (topUsers[0]?.profit ?? 0) < 0 ? '-' : ''}${formatCurrency(Math.abs(topUsers[0]?.profit ?? 0))}`}
            </div>
          </div>

          {/* 3등 */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <LazyLoadImage
                src={optimizeImageUrl(topUsers[2]?.profileImageUrl || PLACEHOLDER)}
                alt={topUsers[2]?.nickname || 'User'}
                className="w-16 h-16 rounded-full border-2 border-orange-400 object-cover"
                onError={(e: any) => {
                  (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                }}
                placeholderSrc={PLACEHOLDER}
                effect="blur"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-lg font-bold">
                3
              </div>
            </div>
            <div className="mt-2 font-medium">{topUsers[2]?.nickname}</div>
            <div
              className={`text-xs ${
                activePeriod === '일간'
                  ? (topUsers[2]?.profitRate ?? 0) === 0
                    ? 'text-gray-500'
                    : (topUsers[2]?.profitRate ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
                  : (topUsers[2]?.profit ?? 0) === 0
                    ? 'text-gray-500'
                    : (topUsers[2]?.profit ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
              }`}
            >
              {activePeriod === '일간'
                ? formatPercentage(topUsers[2]?.profitRate)
                : `${(topUsers[2]?.profit ?? 0) > 0 ? '+' : (topUsers[2]?.profit ?? 0) < 0 ? '-' : ''}${formatCurrency(Math.abs(topUsers[2]?.profit ?? 0))}`}
            </div>
          </div>
        </div>
      </div>

      {/* 랭킹 기간 정보 */}
      <div className="bg-white p-4 border-b rounded-t-xl dark:bg-gray-800 dark:text-white mx-4 dark:border-gray-600">
        <div className="text-gray-500 text-sm dark:text-gray-400 flex flex-col">
          <span>
            {activePeriod === '일간'
              ? dailyUpdatedAt
                ? `${format(new Date(dailyUpdatedAt), 'yyyy년 MM월 dd일 HH:mm')} 기준`
                : '업데이트 시간 정보 없음'
              : allUpdatedAt
                ? `${format(new Date(allUpdatedAt), 'yyyy년 MM월 dd일 HH:mm')} 기준`
                : '가입일부터 현재까지'}
          </span>
          {/* <button
            onClick={fetchRanks}
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            새로고침
          </button> */}
        </div>
      </div>

      {/* 나머지 랭킹 */}
      <div className="flex-1 bg-white rounded-b-xl dark:bg-gray-800 dark:text-white mx-4 mb-6 shadow-lg">
        {otherUsers.map((user) => (
          <div
            key={user.rank}
            ref={user === currentMyRank ? myUserRef : null}
            className={`flex items-center p-4 border-b dark:border-gray-700 ${
              user === currentMyRank
                ? `${
                    myUserSticky === 'top'
                      ? 'sticky top-0 z-10 bg-blue-50 dark:bg-blue-900'
                      : myUserSticky === 'bottom'
                        ? 'sticky bottom-0 z-10 bg-blue-50 dark:bg-blue-900'
                        : ''
                  }`
                : ''
            }`}
          >
            <div className="w-8 text-center font-bold mr-4">{user.rank}</div>
            <LazyLoadImage
              src={optimizeImageUrl(user.profileImageUrl)}
              alt={user.nickname}
              className="w-12 h-12 rounded-full mr-4 object-cover"
              onError={(e: any) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER;
              }}
            />
            <div className="flex-1">
              <div className="font-md">{user.nickname}</div>
            </div>
            <div
              className={`text-sm ${
                activePeriod === '일간'
                  ? (user?.profitRate ?? 0) === 0
                    ? 'text-gray-500'
                    : (user?.profitRate ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
                  : (user?.profit ?? 0) === 0
                    ? 'text-gray-500'
                    : (user?.profit ?? 0) > 0
                      ? 'text-red-500'
                      : 'text-blue-500'
              }`}
            >
              {activePeriod === '일간'
                ? formatPercentage(user?.profitRate)
                : `${(user?.profit ?? 0) > 0 ? '+' : (user?.profit ?? 0) < 0 ? '-' : ''}${formatCurrency(Math.abs(user?.profit ?? 0))}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
