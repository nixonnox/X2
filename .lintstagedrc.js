/**
 * lint-staged 설정.
 * 커밋 시 변경된 파일에 대해서만 lint + format을 실행한다.
 * 전체 프로젝트가 아닌 변경분만 검사하여 커밋 속도를 유지한다.
 */
export default {
  "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css}": ["prettier --write"],
};
