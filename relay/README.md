# GitHub 로그인 중계 (Azure Functions)

사이트 챗봇의 **"GitHub 로 로그인"** 은 VS Code 와 같은 GitHub device flow 입니다. GitHub 의 device flow 엔드포인트(`github.com/login/device/code`, `github.com/login/oauth/access_token`)는 CORS 헤더를 주지 않아 정적 페이지가 직접 부를 수 없으므로, 이 함수가 그 두 호출만 대신 전달하고 CORS 헤더를 붙입니다.

- **비밀값 없음** — device flow 는 `client_secret` 이 필요 없습니다. 함수가 가진 설정은 공개 값인 `GITHUB_CLIENT_ID` 와 허용 origin 뿐입니다.
- **저장·로그 없음** — 요청·응답 본문을 기록하지 않고(Application Insights 미사용), 아무것도 저장하지 않습니다. 토큰은 HTTPS 로 한 번 지나갈 뿐입니다.
- **좁은 표면** — `POST /api/github/device/code`, `POST /api/github/token`(grant 는 `device_code`·`refresh_token` 만) 두 개. 허용 origin(`ALLOWED_ORIGINS`) 밖은 403, client id 는 요청이 아니라 설정에서만 가져옵니다.
- 토큰은 브라우저 `sessionStorage` 에만 둡니다(탭을 닫으면 사라짐). GitHub App 토큰은 8시간 만료이고 refresh 도 이 중계로 합니다.

## 구성

| 리소스 | 비고 |
|---|---|
| `<resource group>` (<region>) | 이 중계 전용 리소스 그룹 |
| Function App (Flex Consumption, Node 22) | `func-<name>-<suffix>` · 플랫폼 CORS 로 preflight 처리 |
| Storage + private endpoint (blob · queue · table) + VNet | 구독 정책상 스토리지 공용 네트워크·공유 키가 꺼져 있어 VNet 통합 + user-assigned identity 로 접근 |

## 처음 설정

1. **GitHub App** 을 만듭니다 (`caldova-kr` 조직 또는 개인 계정 → Settings → Developer settings → GitHub Apps → New).
   - Callback URL 은 비워 두고 **Enable Device Flow** 를 켭니다. Webhook 은 끕니다.
   - 권한은 Copilot 사용에 필요한 계정 권한만(리포지토리·조직 권한 없음). 만든 뒤 **Client ID** 를 복사합니다.
   - GitHub App 토큰이 Copilot API 에서 거부되면 같은 방식으로 **OAuth App**(Enable Device Flow)을 만들어 그 Client ID 를 씁니다.
2. 배포·설정:

   ```bash
   GITHUB_CLIENT_ID=<client id> ./relay/deploy.sh
   ```

3. 사이트의 중계 주소는 `docs/javascripts/chat-agent.js` 의 `AUTH_RELAY` 입니다.

테스트: `node --test "tests/*.test.mjs"` (`tests/relay.test.mjs`).
