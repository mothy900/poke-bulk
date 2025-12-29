import { useState, useCallback, useMemo } from "react";

// 추첨 함수를 별도 파일에서 import
import {
  pickRandomParticipant,
  calculateRotationAngle,
} from "../utils/roulettePicker";

interface Participant {
  id: string;
  name: string;
  color: string;
}

// 랜덤 색상 생성 함수
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 30); // 60-90%
  const lightness = 50 + Math.floor(Math.random() * 20); // 50-70%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function Roulette() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  // 인원 추가
  const addParticipant = useCallback(() => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: "",
      color: generateRandomColor(),
    };
    setParticipants((prev) => [...prev, newParticipant]);
  }, []);

  // 인원 제거
  const removeParticipant = useCallback(
    (id: string) => {
      setParticipants((prev) => prev.filter((p) => p.id !== id));
      if (selectedIndex !== null) {
        setSelectedIndex(null);
        setRotationAngle(0);
      }
    },
    [selectedIndex]
  );

  // 이름 변경
  const updateParticipantName = useCallback((id: string, name: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, []);

  // 룰렛 돌리기
  const spinRoulette = useCallback(() => {
    if (participants.length === 0) {
      alert("추첨할 인원을 추가해주세요.");
      return;
    }

    const names = participants.map(
      (p) => p.name || `인원 ${participants.indexOf(p) + 1}`
    );
    const emptyNames = names.filter((name) => !name.trim());
    if (emptyNames.length > 0) {
      alert("모든 인원의 이름을 입력해주세요.");
      return;
    }

    setIsSpinning(true);
    setSelectedIndex(null);

    // 추첨 함수 호출 (별도 파일에서 import)
    const pickedIndex = pickRandomParticipant(names);

    // 애니메이션을 위한 회전 각도 계산
    const targetAngle = calculateRotationAngle(
      pickedIndex,
      participants.length
    );

    // 회전 애니메이션 시작
    setRotationAngle(targetAngle);

    // 애니메이션 완료 후 결과 표시
    setTimeout(() => {
      setSelectedIndex(pickedIndex);
      setIsSpinning(false);
    }, 3000); // 3초 애니메이션
  }, [participants]);

  // 각 섹션의 각도 계산
  const anglePerSlice = participants.length > 0 ? 360 / participants.length : 0;

  // 룰렛 스타일 계산
  const rouletteStyle = useMemo(() => {
    return {
      transform: `rotate(${rotationAngle}deg)`,
      transition: isSpinning
        ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
        : "none",
    };
  }, [rotationAngle, isSpinning]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            룰렛 추첨
          </h1>

          {/* 인원 관리 섹션 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                추첨 인원 관리
              </h2>
              <button
                onClick={addParticipant}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + 인원 추가
              </button>
            </div>

            <div className="space-y-3">
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  인원을 추가하여 시작하세요.
                </p>
              ) : (
                participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: participant.color }}
                    />
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) =>
                        updateParticipantName(participant.id, e.target.value)
                      }
                      placeholder={`인원 ${index + 1} 이름 입력`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSpinning}
                    />
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      disabled={isSpinning}
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 룰렛 섹션 */}
          {participants.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-col items-center">
                <div className="relative w-80 h-80 md:w-96 md:h-96 mb-8">
                  {/* 룰렛 컨테이너 */}
                  <div className="relative w-full h-full">
                    {/* 룰렛 원판 - SVG 사용 */}
                    <svg
                      className="absolute inset-0 rounded-full border-8 border-gray-800 shadow-2xl"
                      viewBox="0 0 200 200"
                      style={rouletteStyle}
                    >
                      {participants.map((participant, index) => {
                        const startAngle =
                          (index * anglePerSlice - 90) * (Math.PI / 180);
                        const endAngle =
                          ((index + 1) * anglePerSlice - 90) * (Math.PI / 180);
                        const radius = 100;
                        const centerX = 100;
                        const centerY = 100;

                        const x1 = centerX + radius * Math.cos(startAngle);
                        const y1 = centerY + radius * Math.sin(startAngle);
                        const x2 = centerX + radius * Math.cos(endAngle);
                        const y2 = centerY + radius * Math.sin(endAngle);

                        const largeArcFlag = anglePerSlice > 180 ? 1 : 0;

                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                        // 텍스트 위치 계산
                        const textAngle =
                          (index * anglePerSlice + anglePerSlice / 2 - 90) *
                          (Math.PI / 180);
                        const textRadius = 70;
                        const textX =
                          centerX + textRadius * Math.cos(textAngle);
                        const textY =
                          centerY + textRadius * Math.sin(textAngle);

                        return (
                          <g key={participant.id}>
                            <path
                              d={pathData}
                              fill={participant.color}
                              stroke="#fff"
                              strokeWidth="2"
                            />
                            <text
                              x={textX}
                              y={textY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="14"
                              fontWeight="bold"
                              style={{
                                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                              }}
                            >
                              {participant.name || `인원 ${index + 1}`}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* 중앙 포인터 */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                      <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-600"></div>
                    </div>
                  </div>
                </div>

                {/* 추첨 버튼 */}
                <button
                  onClick={spinRoulette}
                  disabled={isSpinning || participants.length === 0}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSpinning ? "추첨 중..." : "룰렛 돌리기"}
                </button>

                {/* 결과 표시 */}
                {selectedIndex !== null && !isSpinning && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg animate-pulse">
                    <p className="text-2xl font-bold text-white text-center">
                      🎉 추첨 결과 🎉
                    </p>
                    <p className="text-3xl font-bold text-white text-center mt-4">
                      {participants[selectedIndex].name ||
                        `인원 ${selectedIndex + 1}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
