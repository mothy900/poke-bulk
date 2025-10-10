# 포켓몬 GO PvP IV 계산기

포켓몬 GO PvP 리그에서 최적의 IV 조합을 찾아주는 웹 애플리케이션입니다.

## 🚀 주요 기능

### 📊 IV 분석 및 계산

- **실시간 IV 입력**: 다양한 형식으로 IV 값을 입력 (예: `0/14/15`, `0.1.1`, `000805`)
- **자동 CP 계산**: 입력된 IV에 따른 CP, 레벨, 스탯% 자동 계산
- **최적 조합 찾기**: 각 포켓몬의 최적 IV 조합 자동 탐지

### 🏆 리그별 최적화

- **슈퍼리그** (CP 1500 이하)
- **하이퍼리그** (CP 2500 이하)
- **마스터리그** (CP 제한 없음)

### 📈 랭킹 시스템

- **상위 조합 표시**: 각 포켓몬의 상위 IV 조합 랭킹 테이블
- **순위별 정렬**: 스탯% 기준으로 정렬된 조합 목록
- **가변 표시 개수**: 상위 10/30/50/100개 조합 선택 가능

### 🔍 포켓몬 검색

- **한글/영어 검색**: 포켓몬 이름으로 검색 (자동완성 지원)
- **실시간 제안**: 입력 중인 텍스트에 맞는 포켓몬 제안

## 🛠 기술 스택

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite (Rolldown 기반)
- **Linting**: ESLint

## 📦 설치 및 실행

### 필요 조건

- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 🎯 사용법

1. **포켓몬 선택**: 검색창에 포켓몬 이름을 입력하여 선택
2. **리그 선택**: 슈퍼리그, 하이퍼리그, 마스터리그 중 선택
3. **IV 입력**: 각 행에 IV 값을 입력 (공격/방어/체력)
4. **결과 확인**:
   - CP, 레벨, 스탯% 자동 계산
   - 최적 조합 자동 표시
   - 상위 랭킹 조합 확인

### IV 입력 형식

- `0/14/15` - 공격/방어/체력
- `0.1.1` - 공격.방어.체력
- `000805` - 3자리씩 공격/방어/체력

## 📁 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
├── data/               # 포켓몬 데이터
│   ├── pokemon/        # 포켓몬 메타데이터
│   ├── pokemonData.ts  # 기본 포켓몬 데이터
│   └── pokemonRegistry.ts # 포켓몬 검색 로직
├── lib/                # 유틸리티 함수
├── pages/              # 페이지 컴포넌트
├── types/              # TypeScript 타입 정의
└── utils/              # 계산 로직
    └── pokemonCalculations.ts # 핵심 계산 함수
```

## 🔧 핵심 계산 로직

### CP 계산

```typescript
CP = (공격력 + 공격IV) × √(방어력 + 방어IV) × √(체력 + 체력IV) × CPM² / 10
```

### 스탯% 계산

```typescript
스탯% = (현재 스탯곱 / 최대 스탯곱) × 100
```

### 최적 IV 탐색

- 모든 가능한 IV 조합 (0-15) 탐색
- CP 제한 내에서 최대 스탯곱 조합 선택
- 레벨 1-51 범위에서 최적화

## 📊 데이터 소스

- **포켓몬 기본 스탯**: 공식 포켓몬 GO 데이터
- **CP 배수**: 레벨별 CP 배수 테이블
- **포켓몬 이름**: 한글/영어 이름 매핑
- **필드 등장 포켓몬**: `npm run prefetch` 시 자동 갱신
  - 둥지 가능 포켓몬: [PoGoAPI `nesting_pokemon.json`](https://pogoapi.net/api/v1/nesting_pokemon.json)
  - 현재 레이드 보스: [PoGoAPI `raid_bosses.json`](https://pogoapi.net/api/v1/raid_bosses.json)의 `current` 항목
  - 이벤트/시즌 스폰: `scripts/field-sources.json`을 직접 편집하거나 `/admin` 관리자 페이지에서 관리

`npm run prefetch`를 실행하면 위 데이터를 병합해 `scripts/field-sources.json`과 `src/data/fieldPokemon.ts`가 자동으로 생성·갱신됩니다.

## 🚀 개발 스크립트

```bash
# 데이터 사전 갱신 + 필드 포켓몬 생성
npm run prefetch

# 개발 서버 실행 (포트 5173)
npm run dev

# TypeScript 컴파일 + 빌드
npm run build

# ESLint 검사
npm run lint

# 빌드 결과 미리보기
npm run preview
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 개인 사용 목적으로 개발되었습니다.

## 📚 문서

프로젝트의 상세한 문서는 [`docs/`](./docs/) 디렉토리에서 확인할 수 있습니다:

- **[아키텍처 문서](./docs/ARCHITECTURE.md)**: 시스템 구조 및 설계
- **[API 문서](./docs/API.md)**: API 및 데이터 구조
- **[개발 가이드](./docs/DEVELOPMENT.md)**: 개발 환경 설정 및 가이드
- **[사용자 가이드](./docs/USER_GUIDE.md)**: 사용법 및 실전 활용
- **[기술 문서](./docs/TECHNICAL.md)**: 기술적 세부사항 및 최적화

## 📞 문의

프로젝트에 대한 문의사항이나 버그 리포트는 GitHub Issues를 통해 제보해주세요.
