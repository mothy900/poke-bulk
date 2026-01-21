/**
 * 룰렛에서 추첨할 인원을 선택하는 함수
 *
 * 이 함수를 수정하여 추첨 로직을 변경할 수 있습니다.
 *
 * @param participants - 추첨 대상 인원 목록
 * @returns 선택된 인원의 인덱스
 */
export function pickRandomParticipant(participants: string[]): number {
  if (participants.length === 0) {
    throw new Error("추첨할 인원이 없습니다.");
  }

  // 기본 구현: 완전 랜덤 선택
  return Math.floor(Math.random() * participants.length);
}

/**
 * 룰렛 애니메이션을 위한 회전 각도를 계산합니다.
 *
 * @param selectedIndex - 선택된 인원의 인덱스
 * @param totalParticipants - 전체 인원 수
 * @param baseRotations - 기본 회전 횟수 (애니메이션 효과를 위해)
 * @returns 회전 각도 (도 단위)
 */
export function calculateRotationAngle(
  selectedIndex: number,
  totalParticipants: number,
  currentAngle: number = 0,
  baseRotations: number = 5
): number {
  const anglePerSlice = 360 / totalParticipants;

  // SVG에서 각 섹션의 중앙 각도 (SVG는 -90도부터 시작)
  const selectedCenterAngle =
    selectedIndex * anglePerSlice + anglePerSlice / 2 - 90;

  // 선택된 인원이 위쪽 포인터(-90도)에 오도록 회전
  // 시계 방향으로 회전하므로 현재 각도에서 목표 각도(-90도)까지의 차이를 계산
  const angleToRotate = -90 - selectedCenterAngle;

  // 여러 바퀴를 돌리기 위해 기본 회전 추가
  const fullRotations = baseRotations * 360;

  // 현재 각도에서 가장 가까운 한 바퀴(360도) 단위로 올림하여 이전 회전은 유지한 채 추가 회전
  // currentAngle이 음수일 수 있으므로 이를 고려하여 다음 기준 각도를 설정
  const nextBaseAngle = Math.ceil(currentAngle / 360) * 360;

  // 최종 회전 각도: 다음 기준 각도 + 추가 회전 + 목표 지점까지의 각도 차이
  // 만약 currentAngle에서 목표 지점까지 시계방향으로 이동할 때 currentAngle보다 작아지면 안되므로 보정
  let targetAngle = nextBaseAngle + fullRotations + angleToRotate;
  
  while (targetAngle <= currentAngle + 360) {
    targetAngle += 360;
  }

  return targetAngle;
}
