<div align="center">
  <img src="../assets/logo.svg" width="72" height="72" alt="Agy Powertools Logo" />
  <h1>Agy Powertools</h1>
  <p><strong>Antigravity 2.0용 네이티브 확장 플러그인</strong></p>
  <p>다국어 UI, 컨텍스트 및 사용량 통계, 컴팩트 레이아웃, 대화 분기 및 편집, 다중 계정 전환, 비-TUN 프록시, SSH 및 WSL2 지원</p>
  <!-- plugin-badges:start -->
  <p>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/releases"><img src="https://img.shields.io/github/v/release/WhiteBr1ck/agy-powertools?label=Release&color=2563eb" height="20" alt="Release" /></a>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WhiteBr1ck/agy-powertools/ci.yml?label=CI" height="20" alt="CI" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/github/license/WhiteBr1ck/agy-powertools?label=License&color=16a34a" height="20" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Antigravity-2.35.0-0f172a" height="20" alt="Antigravity 2.35.0" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-339933" height="20" alt="Node.js >= 22.13" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL2-475569" height="20" alt="Platform" />
  </p>
  <!-- plugin-badges:end -->
  <p><a href="../README.md">简体中文</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="../README_EN.md">English</a> | <a href="README_FR.md">Français</a> | <a href="README_JA.md">日本語</a> | <strong>한국어</strong> | <a href="README_DE.md">Deutsch</a> | <a href="README_ES.md">Español</a> | <a href="README_RU.md">Русский</a></p>
  <p>
    <a href="#스크린샷">스크린샷</a> |
    <a href="#주요-기능">주요 기능</a> |
    <a href="#설치">설치</a> |
    <a href="#설정">설정</a> |
    <a href="#변경-이력">변경 이력</a>
  </p>
</div>

<p align="center">
  <img src="./images/hero-workspace.png" alt="Agy Powertools 작업 공간" width="100%" />
</p>

> 로컬 디버깅 인터페이스를 통해 Antigravity 2.0에 연결하고, 로컬 SQLite 및 JSONL 세션 파일을 읽기 전용 모드로 읽어옵니다. 클라이언트 설치 파일을 수정하거나 외부 웹페이지를 열지 않습니다.

---

## 스크린샷

<table>
  <tr>
    <th width="50%">컨텍스트 창 및 속도 통계</th>
    <th width="50%">개요 작업 진행 및 할당량</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-composer.png" alt="컨텍스트 창 및 속도 통계" width="100%" />
      <p>모델 선택기 옆에서 컨텍스트 사용량, 캐시 재사용률, 생성 속도를 확인할 수 있으며, 입력창 둘레에 할당량 헤일로를 선택적으로 표시할 수 있습니다.</p>
    </td>
    <td>
      <img src="./images/card-overview-panel.png" alt="개요 작업 진행 및 할당량" width="100%" />
      <p>오른쪽 개요 패널에서 실시간 실행 단계, 단계별 소요 시간, 잔여 모델 할당량을 추적하고 섹션 헤더를 클릭해 접거나 펼칠 수 있습니다.</p>
    </td>
  </tr>
  <tr>
    <th>사용량 개요 (라이트)</th>
    <th>사용량 개요 (다크)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-dashboard-light.png" alt="라이트 테마 사용량 개요" width="100%" />
      <p>기본적으로 현재 주간 할당량 주기를 표시하며, 요청 수, 토큰, 캐시 적중률, 추정 비용, 53주 히트맵, 모델 상태를 한눈에 보여줍니다.</p>
    </td>
    <td>
      <img src="./images/card-dashboard-dark.png" alt="다크 테마 사용량 개요" width="100%" />
      <p>클라이언트의 라이트 및 다크 테마를 자동으로 따르며, 모델별 토큰 비중, 비용 비중, 캐시 적중률 및 속도를 비교합니다.</p>
    </td>
  </tr>
  <tr>
    <th>요청 기록 및 캐시 이상 감지</th>
    <th>다중 계정 및 할당량 관리 (기본 꺼짐)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-requests.png" alt="요청 기록 및 캐시 이상 감지" width="100%" />
      <p>계정, 모델, 대화, 상태별로 요청을 필터링하고, 콜드 스타트와 압축을 제외한 단기 간격 캐시 급감을 자동으로 표시합니다.</p>
    </td>
    <td>
      <img src="./images/card-accounts.png" alt="다중 계정 전환 및 할당량 관리" width="100%" />
      <p>OS 기본 키링을 통해 여러 Google 계정을 로컬에 저장하고 전환하며, 5시간 및 주간 할당량을 한곳에서 확인할 수 있습니다.</p>
    </td>
  </tr>
  <tr>
    <th>언어 및 표시 설정</th>
    <th>비-TUN 프록시 (기본 꺼짐)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-settings.png" alt="언어 및 표시 설정" width="100%" />
      <p>9개 인터페이스 언어 중 선택하고, 컴팩트 레이아웃, 사용자 말풍선 색상, 할당량 헤일로 주기를 설정할 수 있습니다.</p>
    </td>
    <td>
      <img src="./images/card-proxy.png" alt="비-TUN 앱 프록시 설정" width="100%" />
      <p>Antigravity만 HTTP 또는 SOCKS5 프록시로 라우팅하며, 내장 연결 테스트, 강제 HTTP/1.1, 앱 내 업데이트 검증을 지원합니다.</p>
    </td>
  </tr>
</table>

---

## 주요 기능

- **다국어 UI**: 대화 본문과 코드 블록은 그대로 유지하면서 Powertools 패널, 주요 Antigravity 메뉴, 권한 대화 상자, 설정 및 Swarm iframe을 현지화합니다.
- **컨텍스트 및 속도 통계**: 입력창 옆에 컨텍스트 사용량 링(캐시 재사용, 압축 횟수, Orchestrator 계획/실행 모델 막대 포함)과 속도 다이얼(`tok/s`, TTFT, 모델 대 도구 소요 시간, 추정 세션 비용)을 추가하며 서브에이전트 통계도 함께 제공합니다.
- **로컬 사용량 및 요청 대시보드**: 데스크톱과 `agy` CLI 사용량을 통합한 `Powertools` 사이드바 페이지를 추가합니다. 사용량 개요(53주 히트맵, 토큰/비용 도넛 차트, 모델 통계 표), 요청별 로그, 단기 간격 캐시 이상 감지, 원클릭 오류 복사, 할당량 추정, 공식 API 요금 새로고침을 포함합니다.
- **컴팩트 레이아웃 및 실시간 단계 업데이트**: 클라이언트 글꼴 크기는 유지하면서 줄 간격과 블록 여백을 조정합니다. 다단계 도구 실행 중 짧은 진행 상황을 보고하고, 완료 후 상단 소요 시간 헤더로 접어 정리합니다.
- **대화 분기 및 인라인 편집**: 모든 응답 또는 대화 메뉴에서 전체 기록(서브에이전트를 사용한 대화 포함)을 유지한 채 새 채팅으로 분기하거나, Antigravity 기본 입력창을 사용해 보낸 메시지를 제자리에서 편집하고 다시 생성할 수 있습니다.
- **다중 계정 전환 (기본 꺼짐)**: Windows 자격 증명 관리자, macOS 키체인 또는 Linux Secret Service를 사용해 평문 토큰 저장 없이 여러 Google 계정을 격리 보관합니다. 사이드바에서 5시간/주간 할당량을 확인하고 전환하며, 할당량 소진 시 자동 전환을 선택적으로 켤 수 있습니다.
- **비-TUN 앱 프록시 (기본 꺼짐)**: 다시 시작 시 Antigravity에만 프록시 인수와 환경 변수를 주입합니다. HTTP CONNECT / SOCKS5 연결 테스트, 콜드 스타트 안내, `EOF` 연결 끊김 완화를 위한 선택적 `GODEBUG=http2client=0` 설정을 지원합니다.
- **SSH 원격 및 WSL2 지원**: 원격 서버에 아무것도 설치하지 않고 로컬 OpenSSH를 통해 데스크톱 `SSH` 창의 원격 세션, 서브에이전트 및 대시보드 통계를 읽어옵니다. NAT 및 Mirrored 네트워킹, 하이브리드 자격 증명 저장소, 재시작 위임을 포함해 내장 WSL2 백엔드가 있는 Windows Antigravity를 지원합니다.
- **파일 컨텍스트 메뉴 및 편의 기능**: 파일 링크나 파일 트리를 우클릭해 채팅에 첨부, 열기, 폴더에서 보기, 파일 복사, 경로 복사(Windows LAN NAS / SMB 경로 포함)를 수행할 수 있습니다. 접기 가능한 개요 작업 진행 및 할당량 패널, 제목 표시줄 읽지 않음 배지, 선택적 입력창 할당량 헤일로 및 사용자 말풍선 색상을 추가합니다.

---

## 쓸모는 없지만 멋진 기능

<p align="center">
  <img src="./images/card-border-beam.webp" alt="작업 중 입력창 테두리 빔 미리보기" width="100%" />
</p>

- **작업 중 입력창 테두리 빔 (기본 꺼짐)**: [border-beam-ios](https://github.com/ismnoiet/border-beam-ios)에서 영감을 받아 경량 둥근 사각형 SDF WebGL 셰이더로 구현했습니다. 에이전트가 작업하는 동안 입력창 둘레를 따라 부드러운 광선과 은은한 내부 빛이 일정한 속도로 흐르며, 턴이 끝나면 유휴 CPU/GPU 사용량 0으로 자연스럽게 사라집니다. 입력창 할당량 헤일로와 함께 켜면 자연스럽게 교차 전환되며, 6가지 색상 팔레트(`Gemini`, `Aurora`, `Colorful`, `Neon`, `Accent`, `Quota`)와 설정 내 실시간 **미리보기** 버튼을 제공합니다.

---

## 설치

> 요구 사항: Antigravity가 설치되어 최소 한 번 이상 실행된 상태여야 합니다. 로컬 Node.js `>= 22.13`을 사용하거나 Antigravity 내장 `agy-node`로 자동 폴백합니다. `npm install`이나 관리자 권한은 필요하지 않습니다.

### 방법 1: 에이전트로 설치 (권장)

Antigravity 또는 다른 로컬 코딩 에이전트에 다음 프롬프트를 보내세요:

> https://github.com/WhiteBr1ck/agy-powertools 에서 Agy Powertools를 설치해 주세요. 먼저 README_EN.md와 docs/INSTALL_AGENT.md를 읽고, 로컬 Node.js 또는 Antigravity 내장 런타임으로 프로젝트의 통합 설치 스크립트를 실행해 주세요. 다른 플러그인, 계정 설정, 대화 기록은 그대로 유지하고 실행 중인 클라이언트를 강제 종료하지 마세요. 설치 후 버전을 확인하고 클라이언트 재시작이 필요한지 알려주세요.

자세한 내용은 [에이전트 설치 가이드](./INSTALL_AGENT.md)를 참고하세요.

### 방법 2: 명령줄 설치

[Releases](https://github.com/WhiteBr1ck/agy-powertools/releases)에서 최신 ZIP을 다운로드해 압축을 풀거나 저장소를 클론한 뒤 아래 명령을 실행하세요:

```powershell
# Windows (PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux / WSL2
sh ./install.sh
```

다시 설치해도 저장된 설정이 유지되며 Antigravity를 강제 종료하지 않습니다. 현재 작업을 마친 뒤 Antigravity를 다시 시작하면 왼쪽 사이드바에 **Powertools**가 표시됩니다. macOS에서는 중복 `.app` 런처를 만들지 않으며, 원본 `Antigravity.app`을 열면 필요 시 디버그 플래그를 붙여 자동으로 한 번 다시 시작합니다(반복 실행 방지 내장, 설정 또는 플러그인 -> Powertools에서 언제든 수동 재시작으로 전환 가능).

### 업데이트 및 제거

- **앱 내 업데이트**: **Powertools -> 설정 -> 정보 -> 업데이트 확인**으로 이동해 **업데이트 설치**를 클릭합니다. 패키지는 SHA-256으로 검증되며, 시작에 실패하면 이전 버전으로 자동 복원됩니다.
- **제거**: `powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1`(Windows) 또는 `sh ./uninstall.sh`(macOS / Linux / WSL2)를 실행합니다. 설정을 유지하려면 `--keep-settings` 옵션을 추가하세요. 기본 대화 기록, 계정, 다른 플러그인은 건드리지 않습니다.

---

## 설정

모든 설정은 **Powertools -> 설정**에서 즉시 적용되며 자동 저장됩니다(하단에 **기본값 복원** 버튼이 있습니다).

<details>
<summary><strong>모든 설정, 환경 변수 및 경로 펼치기</strong></summary>

### 인터페이스 및 표시

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| Powertools 사용 | 켜짐 | 전체 스위치로, 저장된 설정을 유지한 채 모든 UI 확장을 일시 중지할 수 있습니다 |
| 언어 | OS 로케일 | 9개 인터페이스 언어 중 하나를 선택합니다 |
| 로컬 글꼴 및 굵기 | 클라이언트 기본값 | 현지화 이름 또는 패밀리 이름으로 검색해 적용합니다. 굵기는 별도 설정할 수 있으며 재설정 시 둘 다 기본값으로 복원됩니다. 내장 터미널은 클라이언트 글꼴을 유지합니다 |
| 컴팩트 레이아웃 | 켜짐 | 클라이언트 글꼴 크기를 유지하면서 줄 높이(`1.4`), 블록 간격, 도구 행 높이를 줄입니다 |
| 사용자 메시지 말풍선 색상 | 꺼짐 | 사용자 메시지에 배경 색상과 얇은 테두리를 추가합니다(강조 색상, 5가지 프리셋, 사용자 지정 색상, 10%-100% 혼합 강도 슬라이더) |
| 대화 목차 항상 표시 | 켜짐 | 여러 턴 대화에서 왼쪽 턴 이동 레일을 항상 표시합니다 |
| 대화 전환 시 개요 유지 | 켜짐 | 대화를 전환해도 오른쪽 개요 패널의 열림 상태를 유지합니다 |
| 프로젝트당 표시 대화 수 | `기본값 (6)` | 사이드바에서 프로젝트당 표시할 대화 수를 제어합니다(`기본값 (6)`, `1-10`, 또는 `모두 표시`) |
| 사이드바에 폴더 드롭 | 켜짐 | 로컬 창에서 폴더를 사이드바에 드롭해 프로젝트를 만들거나 엽니다 |
| 드롭한 프로젝트 자동 고정 | 꺼짐 | 폴더 드롭으로 생성하거나 연 프로젝트를 상단에 자동 고정합니다 |
| 사이드바 실행 중 테두리 빔 | 꺼짐 | 실행 중인 사이드바 대화 항목에 테두리 빔 효과를 표시합니다(기본적으로 입력창 팔레트 따름 또는 별도 선택, 기본 4점 스피너 숨기기 및 실시간 미리보기 지원, 승인 대기 시 호박색 표시) |
| 사이드바 실행 중 대화 그룹 | 꺼짐 | 실행 중인 모든 대화, 프로젝트, 활성 서브에이전트, 확인 대기 알림을 사이드바 상단에 고정 표시하며 유휴 시 자동으로 숨깁니다 |
| 작업 표시줄 읽지 않음 배지 | 켜짐 | 백그라운드 대화가 완료되면 창 및 작업 표시줄 제목에 `(N)` 읽지 않음 수를 표시합니다 |

### 통계 및 진행 상태

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| 개요 기본 기간 | `현재 주간 할당량` | 주간 할당량 주기, 오늘, 최근 24시간, 어제, 이번 주, 이번 달, 최근 30일 또는 전체 기간 중 선택합니다 |
| 컨텍스트 링 | 켜짐 | 컨텍스트 사용량 링, 캐시 재사용 세부 내역 및 Orchestrator 모델별 막대를 표시합니다 |
| 속도 및 통계 | 켜짐 | 속도 다이얼을 표시하고 클릭 시 세션 통계 및 추정 비용을 엽니다 |
| 작업 진행 | 켜짐 | 체크리스트 진행률, 실시간 단계 및 단계별 소요 시간을 접기 가능한 개요 섹션에 표시합니다 |
| 개요에 할당량 표시 | 꺼짐 | 5시간 및 주간 잔여 할당량을 접기 가능한 개요 섹션에 표시합니다 |
| 제목 표시줄 빠른 개요 | 꺼짐 | 오른쪽 상단 제목 표시줄에 Powertools 트리거를 추가해 현재 대화 위에서 6개 탭 팝오버를 엽니다 |
| 입력창 할당량 헤일로 | 꺼짐 | 입력창 카드 둘레에 잔여 할당량을 시계 방향으로 표시합니다(에메랄드, 호박색, 빨강) |
| 할당량 헤일로 주기 | `자동 (낮은 항목)` | 헤일로 활성화 시 `자동 (낮은 항목)`, `주간 한도`, `5시간 한도` 중 선택합니다 |
| 작업 중 입력창 테두리 빔 | 꺼짐 | 작업 중 입력창 둘레에 부드러운 테두리 빔을 애니메이션으로 표시합니다(유휴 시 비용 0, 할당량 헤일로와 자연스럽게 전환, 6가지 팔레트 및 실시간 미리보기) |
| 서브에이전트 컨텍스트 및 통계 | 켜짐 | 서브에이전트별 모델, 컨텍스트 사용량, 토큰, 캐시 적중률, 속도 및 비용을 표시합니다 |
| 턴 소요 시간 / 도구 펼치기 | 켜짐 | 완료된 턴 상단에 총 소요 시간을 표시하고 클릭 시 도구 세부 내역을 펼칩니다 |
| 턴 하단 통계 | 꺼짐 | 완료된 응답 하단에 턴별 모델, 캐시 적중률, 입력/출력 토큰, 추정 비용을 표시하며 마우스를 올리면 전체 세부 내역을 보여줍니다 |

### 대화 향상, 계정, 프록시 및 실험적 컨텍스트

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| 단계별 진행 보고 | 켜짐 | 도구 실행 중 짧은 진행 상황을 보고하고 완료 시 접습니다 |
| 병렬 검색 및 읽기 | 꺼짐 | 한 턴 안에서 파일 검색과 읽기를 일괄 처리하도록 에이전트를 안내합니다 |
| 기본 검색창 전체 텍스트 검색 | 켜짐 | 기본 대화 검색 모달을 확장해 메시지 본문, 코드 블록, 터미널 명령을 검색하고 일치하는 턴으로 바로 이동합니다 |
| 대화 분기 / 메시지 편집 / 파일 메뉴 | 켜짐 | 네이티브 대화 분기, 인라인 메시지 편집 및 로컬/NAS/파일 트리 컨텍스트 메뉴(설치된 앱으로 열기 및 `#L:C` 줄 이동 포함)를 제공합니다 |
| 붙여넣은 SSH 명령 인식 | 켜짐 | 새 프로젝트 -> SSH Host에 `ssh -p PORT user@host`를 붙여넣으면 `user@host:port`를 자동 추출합니다(붙여넣은 비밀번호는 무시) |
| 다중 계정 전환 사용 | 꺼짐 | 위험 안내 확인 후 활성화; 사이드바 전환기, 목록/카드 보기, 5시간/주간 전환 및 자동 전환을 제공합니다 |
| 앱 전용 프록시 (비-TUN) | 꺼짐 | 프로토콜/호스트/포트 설정, 연결 테스트, 콜드 스타트 안내 및 강제 HTTP/1.1을 제공합니다 |
| 컨텍스트 목표 (실험적) | `기본값` | `기본값`, `256K`, `500K`, `1M` 중 선택합니다(`기본값`은 클라이언트 기본 설정을 변경하지 않음) |

### 환경 변수 및 경로

| 이름 / 경로 | 설명 |
| --- | --- |
| `ANTIGRAVITY_USER_DATA_DIR` | 격리된 프로필을 위한 사용자 지정 Antigravity 사용자 데이터 디렉터리 |
| `ANTIGRAVITY_CLI_DATA_DIR` | 사용자 지정 `agy` CLI 데이터 디렉터리 (기본값: `~/.gemini/antigravity-cli`) |
| `ANTIGRAVITY_CDP_PORT_FILE` | `DevToolsActivePort`의 명시적 경로 (`AGY_BROWSER_ACTIVE_PORT_FILE`도 지원) |
| `~/.gemini/config/plugins/agy-powertools/` | 설치된 플러그인 파일 및 런타임 스크립트 |
| `~/.gemini/antigravity/plugin_data/agy-powertools/` | 저장된 설정, 계정 메타데이터, 할당량 샘플 및 요금 캐시 |

</details>

---

## 변경 이력

### v2.16.8
- **20 MB 초과 파일을 입력창에 드롭 시 네이티브 파일 참조로 자동 변환 (#46)**: Antigravity 기본 20 MB 첨부 제한을 유지하면서 20 MB 초과 로컬 파일만 내용을 읽지 않고 네이티브 파일 참조로 삽입합니다(혼합 드롭 시 일반 첨부 유지, 사이드바 및 SSH 원격 창 격리).
- **사이드바 표시 메뉴 번역 컨텍스트 보호 (PR #82 통합, `@statertly-pixel` 감사)**: `Project`, `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles`, `Decorations` 항목을 9개 언어 모두에서 메뉴 컨텍스트로 한정하여 동일한 이름의 대화나 프로젝트 제목이 오역되지 않도록 했습니다.

### v2.16.7
- **9개 언어 기본 다국어 지원 (프랑스어 PR #80 통합, `@oxibys` 기여)**: 프랑스어, 일본어, 한국어, 독일어, 스페인어, 러시아어를 모듈형 온디맨드 언어 팩(`lib/locales/` 및 `i18n.pack` RPC)으로 추가하고 9개 언어 README를 완비했습니다.
- **사이드바 표시 옵션 메뉴 번역 보완 (#79)**: `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles`, `Decorations` 및 메뉴 내 `Project` 항목을 추가했습니다.
- **Windows 11 재시작 후 Windows Terminal 잔류 및 창 닫힘 시 클라이언트 동반 종료 수정 (#61 후속, `@poneisme` 감사)**: 창 없는 CUI 중계(`-LaunchOnly`)와 `Start-Process` 조합으로 백신 오탐 없이 ConPTY 핸들 상속과 콘솔 연결을 완전히 차단했습니다.

### v2.16.6
- **실행 중 빔 활성화 시 사이드바 대화 행 클릭 불가 문제 수정**: Antigravity의 `position: absolute; inset: 0` 행 링크를 무너뜨리던 하위 요소의 `position: relative` 재정의를 제거하여 행 전체와 호버 버튼 클릭을 복구했습니다.
- **사이드바 하단 빔 레이어링 및 가장자리 페이드 개선**: `pointer-events: none` 빔 레이어를 호버 작업 막대 위로 올려(`z-index: 20`) 아이콘 뒤의 각진 잘림을 없애고, 좌우 가장자리 페이드 마스크(`.agy-sb-fade`)를 추가했습니다.

### v2.16.5
- **주간 할당량 및 사용량 통계 정확도 수정 (#63)**:
  - `lib/quota.mjs`: 0으로 초기화된 스캔이나 역행한 스캔이 유효한 체크포인트를 덮어쓰지 않도록 방지하고, 로컬 기록 감소 시에도 측정된 진행치를 유지합니다.
  - `lib/dashboard.mjs`: 모든 풀이 하나의 가장 이른 시작 시각을 공유하지 않고 각 요청을 해당 할당량 풀(Gemini / Claude / Argon)의 주간 주기 경계와 매칭합니다.
  - `lib/analytics.mjs`: 오래된 `.db` 파일이 정리되어도 주간 합계가 줄어들지 않도록 프로필별 원자적 사용량 아카이브(90일 보관, 최대 20,000건 요청)를 유지합니다.
- **UI 정리 및 설정 번역 추가**:
  - 입력창 컨텍스트 링, 서브에이전트 링, 속도 통계 트리거의 중복 호버 툴팁을 제거하여(`aria-label`은 유지) 열린 팝오버와 겹치지 않도록 했습니다.
  - 개요 비용 카드와 모델 통계 비용 헤더를 단순화하여 총 비용과 요청당 평균 비용만 표시하도록 정리했습니다.
  - 누락된 Antigravity 2.35.2 설정 번역 5건과 플레이스홀더 복원을 추가했습니다.
- **커뮤니티 PR 및 개선**:
  - **로컬 글꼴 패밀리 및 굵기 선택기 (PR #78, `@awei84` 기여)**: OpenType `name` 테이블과 내장 별칭으로 현지화 글꼴 이름을 추출해 검색할 수 있으며, 선택한 글꼴에서 지원하는 굵기만 표시하고 아이콘 글꼴과 xterm 터미널은 제외합니다.
  - **사이드바 실행 중 하단 빔 및 상단 고정 실행 중 그룹 (PR #76, `@whitzard0421` 기여)**: 둘 다 기본 꺼짐이며, 순수 CSS 하단 광선 효과(`prefers-reduced-motion` 준수)와 네이티브 사이드바 스타일의 실행 중 그룹을 제공합니다.
  - **사이드바에 폴더 드래그하여 프로젝트 생성 (PR #73, `@niuanhua-ydy` 기여)**: 로컬 폴더를 사이드바에 드롭해 프로젝트를 생성하며 디렉터리/심볼릭 링크 검증 및 SSH 원격 창 격리를 지원합니다.
  - **턴별 하단 통계 (PR #65, `@wwwsideexiecom-boop` 기여)**: 기본 꺼짐이며, 완료된 응답 하단에 모델, 캐시 적중률, 입력/출력 토큰, 추정 비용을 표시합니다.

### v2.16.4
- **Windows 재시작 시 콘솔 세션 상속 수정 (#61)**: 재시작 스크립트에서 `ProcessStartInfo`(`UseShellExecute = $false`, `CreateNoWindow = $true`)로 `Antigravity.exe`를 실행해 새 인스턴스가 PowerShell 콘솔 세션을 상속하지 않도록 수정했습니다.
- **macOS 대용량 OAuth 자격 증명 저장 시 argv 노출 방지 (#75)**: `/usr/bin/security -i` 16진수 명령이 4096바이트 줄 버퍼 한도에 근접하면 `stdin`으로 `/usr/bin/osascript -l JavaScript`와 `Security.framework`를 통해 기록하여 모든 크기에서 자격 증명이 `argv`에 노출되지 않도록 했습니다.
- **긴 대화 폴링 파싱 및 전송 부하 감소 (#62)**: 사이드카에서 파일 타임스탬프(`task.md` 포함), 실행 상태, 요금, 설정 기준으로 파싱된 세션 스냅샷을 캐시하고 변경이 없으면 `{ unchanged: true, stateRev }`만 반환합니다.
- **macOS 콜드 스타트 자동 재시작 쿨다운 및 경합 수정 (#64)**: 디버그 포트 또는 프록시가 준비되면 쿨다운 타임스탬프를 초기화하고, 동시 경로가 최대 한 번만 재시작을 예약하도록 조율했습니다.
- **인라인 편집 단축키 및 초안 복구 수정 (#70)**: 호스트의 `sendWithModEnter` 설정을 존중하고, 다른 창에서 대화가 시작될 경우 편집 전 초안과 첨부 파일을 복원합니다.
- **대화 전환 시 대체 목차 깜빡임 방지 (#74)**: 기본 `conversation-navigator` 마운트를 기다리는 220ms 유예 시간을 추가했습니다.
- **사용자 지정 번역 재정의, 2.35 슬래시 명령 번역 및 OS 로케일 기본값 추가 (#68, #69)**: `plugin_data/agy-powertools/custom-i18n.json` 추가 재정의, 2.35 신규 슬래시 명령 10종 번역 및 OS 로케일 기반 초기 언어 설정을 지원합니다.
- **커뮤니티 PR**: SSH 원격 초기 부팅 복구(PR #67, `@qimengdunjia`), Antigravity CLI 텔레메트리 통합 및 Argon 할당량 풀 분리(PR #71, `@zhangyu-ch`), 관리 페이지 상단 헤더 및 필터 바 고정(PR #72, `@niuanhua-ydy`).

전체 변경 이력은 [영문 README 변경 이력](../README_EN.md#changelog)에서 확인할 수 있습니다.

---

## 라이선스 및 링크

- **라이선스**: [MIT License](../LICENSE) (사용자 지정 날짜 범위 달력은 `react-day-picker` 및 `date-fns` 기반의 HextaUI를 수정해 사용합니다. 자세한 내용은 [lib/vendor/NOTICE.txt](../lib/vendor/NOTICE.txt) 참고)
- **이슈 제보**: [GitHub Issues](https://github.com/WhiteBr1ck/agy-powertools/issues) (OS, Antigravity 버전, 플러그인 버전을 함께 기재해 주세요)
- **커뮤니티**: [LINUX DO](https://linux.do/)
