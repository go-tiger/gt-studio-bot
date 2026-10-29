# GT Studio Bot

마인크래프트 커스텀 런처 제작 의뢰를 관리하는 Discord 봇입니다. NestJS와 [Necord](https://necord.org)를 기반으로 하며, 티켓 채널 생성과 의뢰 정보 수집을 자동화합니다.

## 주요 기능

- `/setup` 명령어로 서버별 티켓 시스템 설정 (관리자 역할, 티켓/아카이브 카테고리 지정)
- 버튼 클릭 시 의뢰 모달을 통해 정보 입력 후 개인 티켓 채널 자동 생성
- 의뢰 처리(승인/거절 등) 액션 핸들링
- PostgreSQL + TypeORM 기반 길드 설정 및 티켓 데이터 저장

## 기술 스택

- [NestJS](https://nestjs.com) 12
- [Necord](https://necord.org) 7 / [discord.js](https://discord.js.org) 14
- TypeORM + PostgreSQL
- Docker / GitHub Actions (GHCR 배포)

## 프로젝트 구조

```
src/
  core/
    entities/       # TypeORM 엔티티 (GuildSettings, Ticket, TicketLauncher)
  discord/
    commands/       # 기본 슬래시 명령어 (ping 등)
    discord.module.ts
  ticket/
    commands/       # /setup 명령어 및 옵션 DTO
    handlers/       # 버튼, 모달, 의뢰 액션 핸들러
    ticket.service.ts
```

## 환경 설정

`.env.example`을 참고해 `.env` 파일을 작성합니다.

```
# Database
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_DATABASE=

DISCORD_TOKEN=your_discord_bot_token_here
```

## 설치 및 실행

```bash
$ npm install
```

```bash
# 개발 모드
$ npm run start:dev

# 프로덕션 모드
$ npm run start:prod
```

## 배포

`main` 브랜치에 병합되면 GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 Docker 이미지를 빌드해 GHCR(`ghcr.io/go-tiger/gt-studio-bot`)에 게시합니다.

서버에서는 `docker-compose.yml`을 이용해 실행합니다.

```bash
$ docker compose up -d
```

## License

UNLICENSED (미정)
