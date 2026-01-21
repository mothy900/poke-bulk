import { useState, useCallback, useMemo } from "react";
import { calculateRotationAngle } from "../utils/roulettePicker";

interface Participant {
  id: string;
  name: string;
  color: string;
}

// 반드시 당첨되어야 하는 이름 리스트
const hitList: string[] = ["박태근", "서동현","홍표제","이충기","반재두","윤동섭","정관모",];
// 절대로 당첨되면 안되는 이름 리스트
const missList: string[] = ["윤재희"];

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 30);
  const lightness = 50 + Math.floor(Math.random() * 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function Roulette() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  const addParticipant = useCallback(() => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: "",
      color: generateRandomColor(),
    };
    setParticipants((prev) => [...prev, newParticipant]);
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setSelectedIndex(null);
  }, []);

  const updateParticipantName = useCallback((id: string, name: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, []);

  const spinRoulette = useCallback(() => {
    if (participants.length === 0) {
      alert("추첨할 인원을 추가해주세요.");
      return;
    }

    const names = participants.map(
      (p, i) => p.name.trim() || `인원 ${i + 1}`
    );

    let pickedIndex = -1;

    // 1. Hit List 체크: hitList에 포함된 이름이 참여자에 있다면 첫 번째 발견된 사람을 당첨자로 선정
    for (const hitName of hitList) {
      const index = names.indexOf(hitName);
      if (index !== -1) {
        pickedIndex = index;
        break;
      }
    }

    // 2. Hit List에 해당자가 없으면 Miss List를 제외하고 추첨
    if (pickedIndex === -1) {
      const validIndices = names
        .map((name, index) => (missList.includes(name) ? -1 : index))
        .filter((index) => index !== -1);

      if (validIndices.length === 0) {
        alert("당첨 가능한 인원이 없습니다.");
        return;
      }

      const randomValidIndex = Math.floor(Math.random() * validIndices.length);
      pickedIndex = validIndices[randomValidIndex];
    }

    setIsSpinning(true);
    setSelectedIndex(null);

    const targetAngle = calculateRotationAngle(
      pickedIndex,
      participants.length,
      rotationAngle
    );
    setRotationAngle(targetAngle);

    setTimeout(() => {
      setSelectedIndex(pickedIndex);
      setIsSpinning(false);
    }, 3000);
  }, [participants, rotationAngle]);

  const anglePerSlice = participants.length > 0 ? 360 / participants.length : 0;

  const rouletteStyle = useMemo(() => ({
    transform: `rotate(${rotationAngle}deg)`,
    transition: "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)",
  }), [rotationAngle]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">룰렛 추첨</h1>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700">추첨 인원 관리</h2>
              <button onClick={addParticipant} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">+ 인원 추가</button>
            </div>
            <div className="space-y-3">
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">인원을 추가하여 시작하세요.</p>
              ) : (
                participants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: participant.color }} />
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => updateParticipantName(participant.id, e.target.value)}
                      placeholder={`인원 ${index + 1} 이름 입력`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSpinning}
                    />
                    <button onClick={() => removeParticipant(participant.id)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors" disabled={isSpinning}>삭제</button>
                  </div>
                ))
              )}
            </div>
          </div>
          {participants.length > 0 && (
            <div className="mb-8 flex flex-col items-center">
              <div className="relative w-80 h-80 md:w-96 md:h-96 mb-8">
                <svg className="absolute inset-0 rounded-full border-8 border-gray-800 shadow-2xl" viewBox="0 0 200 200" style={rouletteStyle}>
                  {participants.map((participant, index) => {
                    const startAngle = (index * anglePerSlice - 90) * (Math.PI / 180);
                    const endAngle = ((index + 1) * anglePerSlice - 90) * (Math.PI / 180);
                    const radius = 100, centerX = 100, centerY = 100;
                    const x1 = centerX + radius * Math.cos(startAngle), y1 = centerY + radius * Math.sin(startAngle);
                    const x2 = centerX + radius * Math.cos(endAngle), y2 = centerY + radius * Math.sin(endAngle);
                    const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${anglePerSlice > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
                    const textAngle = (index * anglePerSlice + anglePerSlice / 2 - 90) * (Math.PI / 180);
                    const textX = centerX + 70 * Math.cos(textAngle), textY = centerY + 70 * Math.sin(textAngle);
                    return (
                      <g key={participant.id}>
                        <path d={pathData} fill={participant.color} stroke="#fff" strokeWidth="2" />
                        <text x={textX} y={textY} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                          {participant.name || `인원 ${index + 1}`}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-600"></div>
                </div>
              </div>
              <button onClick={spinRoulette} disabled={isSpinning} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50">
                {isSpinning ? "추첨 중..." : "룰렛 돌리기"}
              </button>
              {selectedIndex !== null && !isSpinning && (
                <div className="mt-8 p-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg animate-pulse text-center">
                  <p className="text-2xl font-bold text-white">🎉 추첨 결과 🎉</p>
                  <p className="text-3xl font-bold text-white mt-4">{participants[selectedIndex].name || `인원 ${selectedIndex + 1}`}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
