/**
 * 공유 ESLint 기본 설정 (Flat Config 형식).
 *
 * 구성:
 * 1. eslint:recommended — JS 기본 규칙
 * 2. typescript-eslint — TS 타입 검사 규칙
 * 3. eslint-config-prettier — Prettier와 충돌하는 규칙 비활성화
 * 4. eslint-plugin-turbo — 모노레포 환경변수 미선언 경고
 *
 * 각 앱/패키지에서 이 설정을 확장하여 사용한다.
 */
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import turbo from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: { turbo },
    rules: {
      // turbo.json에 선언되지 않은 환경변수 사용 시 경고
      "turbo/no-undeclared-env-vars": "warn",
      // _로 시작하는 매개변수는 미사용 허용 (콜백 시그니처 등)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  { ignores: ["node_modules/", "dist/", ".next/", ".turbo/"] },
);
