/**
 * TopicTaxonomyMappingService
 *
 * cluster 결과(label, memberItems)를 업종별 topicTaxonomy에 매핑.
 * "레티놀 세럼 비교" 클러스터 → BEAUTY의 "성분분석", "스킨케어" 카테고리에 매핑.
 *
 * 하는 일:
 * 1. 클러스터 label/member text → topicTaxonomy 카테고리 매칭
 * 2. 매칭 confidence 산출 (token overlap 기반)
 * 3. multi-taxonomy 매칭 지원 (하나의 클러스터가 여러 카테고리에 걸칠 수 있음)
 * 4. 매핑 안 되는 클러스터 → "기타" 분류 + 경고
 */

import type { IndustryType, VerticalDocumentProfile } from "./types";
import { BEAUTY_PROFILE } from "./beauty-template";
import { FNB_PROFILE } from "./fnb-template";
import { FINANCE_PROFILE } from "./finance-template";
import { ENTERTAINMENT_PROFILE } from "./entertainment-template";

// ─── Types ───────────────────────────────────────────────────────

export type ClusterInput = {
  clusterId: string;
  label: string;
  memberTexts: string[];
  score?: number;
};

export type TaxonomyMatch = {
  category: string;
  confidence: number;
  matchedTerms: string[];
};

export type ClusterTaxonomyMapping = {
  clusterId: string;
  clusterLabel: string;
  industryType: IndustryType;
  matches: TaxonomyMatch[];
  bestMatch: TaxonomyMatch | null;
  isUnmapped: boolean;
};

export type TaxonomyMappingResult = {
  industryType: IndustryType;
  mappings: ClusterTaxonomyMapping[];
  taxonomyCoverage: Record<string, number>;
  unmappedCount: number;
  totalClusters: number;
};

// ─── 카테고리별 확장 키워드 사전 ─────────────────────────────────

const TAXONOMY_KEYWORDS: Record<IndustryType, Record<string, string[]>> = {
  BEAUTY: {
    스킨케어: [
      "스킨",
      "로션",
      "토너",
      "에센스",
      "크림",
      "세럼",
      "앰플",
      "수분",
      "보습",
      "피부결",
    ],
    메이크업: [
      "파운데이션",
      "립스틱",
      "아이섀도",
      "블러셔",
      "컨실러",
      "프라이머",
      "메이크업",
      "화장",
    ],
    헤어케어: ["샴푸", "트리트먼트", "헤어", "탈모", "두피", "염색", "펌"],
    바디케어: ["바디", "핸드크림", "풋크림", "보디로션", "바디워시", "입욕"],
    성분분석: [
      "성분",
      "레티놀",
      "비타민C",
      "나이아신아마이드",
      "히알루론산",
      "콜라겐",
      "AHA",
      "BHA",
      "세라마이드",
      "펩타이드",
    ],
    피부타입: ["건성", "지성", "복합성", "민감성", "피부타입", "T존", "유분"],
    트러블케어: [
      "트러블",
      "여드름",
      "모공",
      "피지",
      "블랙헤드",
      "화이트헤드",
      "진정",
    ],
    안티에이징: [
      "주름",
      "탄력",
      "안티에이징",
      "노화",
      "리프팅",
      "팔자주름",
      "눈가",
    ],
    클렌징: [
      "클렌징",
      "세안",
      "이중세안",
      "폼클렌저",
      "오일클렌저",
      "미셀라워터",
    ],
    선케어: ["선크림", "자외선", "SPF", "PA", "선블록", "UV", "차단"],
    "리뷰/후기": [
      "후기",
      "리뷰",
      "비교",
      "추천",
      "랭킹",
      "베스트",
      "사용감",
      "발림성",
    ],
  },
  FNB: {
    "메뉴/음식": [
      "메뉴",
      "음식",
      "요리",
      "레시피",
      "맛",
      "식사",
      "안주",
      "반찬",
    ],
    "가격/가성비": [
      "가격",
      "가성비",
      "저렴",
      "할인",
      "쿠폰",
      "이벤트",
      "세트",
      "원",
    ],
    "배달/포장": [
      "배달",
      "포장",
      "테이크아웃",
      "배민",
      "쿠팡이츠",
      "요기요",
      "딜리버리",
    ],
    매장방문: ["매장", "방문", "웨이팅", "예약", "분위기", "인테리어", "좌석"],
    지역맛집: [
      "맛집",
      "지역",
      "동네",
      "근처",
      "강남",
      "홍대",
      "이태원",
      "핫플",
    ],
    시즌메뉴: ["시즌", "한정", "신메뉴", "계절", "여름", "겨울", "봄", "가을"],
    프로모션: ["프로모션", "1+1", "할인", "쿠폰", "적립", "멤버십", "이벤트"],
    "후기/리뷰": ["후기", "리뷰", "별점", "평점", "추천", "맛평가"],
    "건강/다이어트": [
      "건강",
      "다이어트",
      "칼로리",
      "영양",
      "단백질",
      "저염",
      "비건",
      "글루텐프리",
    ],
    "카페/디저트": [
      "카페",
      "커피",
      "디저트",
      "베이커리",
      "케이크",
      "음료",
      "차",
      "라떼",
    ],
  },
  FINANCE: {
    예적금: ["예금", "적금", "정기예금", "자유적금", "저축", "이율", "만기"],
    대출: [
      "대출",
      "주담대",
      "신용대출",
      "전세대출",
      "마이너스",
      "상환",
      "원리금",
    ],
    카드: [
      "카드",
      "신용카드",
      "체크카드",
      "포인트",
      "캐시백",
      "할부",
      "연회비",
    ],
    보험: ["보험", "생명보험", "손해보험", "실손", "보장", "보험료", "면책"],
    투자: ["투자", "주식", "펀드", "ETF", "채권", "배당", "수익률", "리스크"],
    금리비교: ["금리", "이자율", "비교", "최저금리", "우대금리", "기준금리"],
    수수료: ["수수료", "중도상환", "이체수수료", "ATM", "해외수수료"],
    가입절차: ["가입", "신청", "절차", "서류", "비대면", "온라인", "앱"],
    해지: ["해지", "중도해지", "위약금", "환불", "해약"],
    신용관리: ["신용", "신용점수", "신용등급", "연체", "NICE", "KCB"],
    재테크: ["재테크", "자산관리", "포트폴리오", "분산투자", "복리"],
    연금: ["연금", "퇴직연금", "국민연금", "IRP", "연금저축"],
  },
  ENTERTAINMENT: {
    "컴백/릴리즈": [
      "컴백",
      "신곡",
      "앨범",
      "릴리즈",
      "발매",
      "타이틀곡",
      "MV",
      "뮤직비디오",
    ],
    "공연/콘서트": [
      "콘서트",
      "공연",
      "투어",
      "월드투어",
      "앙코르",
      "티켓",
      "예매",
      "좌석",
    ],
    팬미팅: ["팬미팅", "팬사인회", "영상통화", "하이터치", "요기요"],
    "굿즈/MD": [
      "굿즈",
      "MD",
      "포토카드",
      "앨범",
      "머치",
      "한정판",
      "시즌그리팅",
    ],
    "스트리밍/차트": [
      "스트리밍",
      "차트",
      "멜론",
      "스포티파이",
      "빌보드",
      "음원",
      "총공",
    ],
    "예능/드라마": [
      "예능",
      "드라마",
      "출연",
      "시청률",
      "방송",
      "OTT",
      "넷플릭스",
    ],
    영화: ["영화", "개봉", "박스오피스", "관객수", "CGV", "메가박스", "시사회"],
    "웹툰/웹소설": [
      "웹툰",
      "웹소설",
      "네이버웹툰",
      "카카오페이지",
      "연재",
      "완결",
    ],
    팬덤활동: [
      "팬덤",
      "덕질",
      "입덕",
      "탈덕",
      "최애",
      "올콘",
      "조공",
      "서포트",
    ],
    "바이럴/밈": ["바이럴", "밈", "짤", "트렌드", "챌린지", "틱톡", "숏폼"],
    IP사업: ["IP", "캐릭터", "라이선스", "콜라보", "브랜드", "팝업스토어"],
  },
};

// ─── Service ─────────────────────────────────────────────────────

export class TopicTaxonomyMappingService {
  private profiles: Record<IndustryType, VerticalDocumentProfile> = {
    BEAUTY: BEAUTY_PROFILE,
    FNB: FNB_PROFILE,
    FINANCE: FINANCE_PROFILE,
    ENTERTAINMENT: ENTERTAINMENT_PROFILE,
  };

  /**
   * 클러스터 목록을 업종의 topicTaxonomy에 매핑
   */
  mapClusters(
    clusters: ClusterInput[],
    industryType: IndustryType,
  ): TaxonomyMappingResult {
    const profile = this.profiles[industryType];
    const taxonomy = profile.topicTaxonomy;
    const keywords = TAXONOMY_KEYWORDS[industryType];

    const mappings = clusters.map((cluster) =>
      this.mapSingleCluster(cluster, industryType, taxonomy, keywords),
    );

    // taxonomy 커버리지 계산: 각 카테고리가 몇 개 클러스터와 매칭되는지
    const taxonomyCoverage: Record<string, number> = {};
    for (const cat of taxonomy) {
      taxonomyCoverage[cat] = mappings.filter((m) =>
        m.matches.some((match) => match.category === cat),
      ).length;
    }

    return {
      industryType,
      mappings,
      taxonomyCoverage,
      unmappedCount: mappings.filter((m) => m.isUnmapped).length,
      totalClusters: clusters.length,
    };
  }

  /**
   * 단일 클러스터 → taxonomy 카테고리 매칭
   */
  private mapSingleCluster(
    cluster: ClusterInput,
    industryType: IndustryType,
    taxonomy: string[],
    keywords: Record<string, string[]>,
  ): ClusterTaxonomyMapping {
    const allTexts = [cluster.label, ...cluster.memberTexts];
    const normalizedTexts = allTexts.map((t) => t.toLowerCase());

    const matches: TaxonomyMatch[] = [];

    for (const category of taxonomy) {
      const categoryKeywords = keywords[category] ?? [];
      const allCategoryTerms = [category, ...categoryKeywords];

      const matchedTerms: string[] = [];
      let totalWeight = 0;

      for (const term of allCategoryTerms) {
        const termLower = term.toLowerCase();
        // 최소 2글자 이상의 키워드만 매칭 (1글자 오탐 방지)
        if (termLower.length < 2) continue;

        for (const text of normalizedTexts) {
          // text가 term을 포함하는 경우만 매칭 (역방향 매칭 제거 — 오탐 방지)
          if (text.includes(termLower)) {
            // label 매칭은 가중치 1.0, member 매칭은 0.5
            const isLabel = text === cluster.label.toLowerCase();
            const weight = isLabel ? 1.0 : 0.5;
            // 카테고리 이름 직접 매칭은 추가 가중치
            const isCategoryName = term === category;
            const bonus = isCategoryName ? 0.3 : 0;

            totalWeight += weight + bonus;
            if (!matchedTerms.includes(term)) {
              matchedTerms.push(term);
            }
          }
        }
      }

      if (matchedTerms.length > 0) {
        // confidence 정규화 (0~1)
        const confidence = Math.min(1.0, totalWeight / 3.0);
        // 최소 confidence 0.2 이상만 매핑으로 인정 (오탐 방지)
        if (confidence >= 0.2) {
          matches.push({ category, confidence, matchedTerms });
        }
      }
    }

    // confidence 내림차순 정렬
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      clusterId: cluster.clusterId,
      clusterLabel: cluster.label,
      industryType,
      matches,
      bestMatch: matches[0] ?? null,
      isUnmapped: matches.length === 0,
    };
  }

  /**
   * 특정 업종의 topicTaxonomy 카테고리 목록 반환
   */
  getTaxonomy(industryType: IndustryType): string[] {
    return this.profiles[industryType].topicTaxonomy;
  }

  /**
   * 모든 업종에 대해 클러스터 매핑 실행 (비교용)
   */
  mapClustersAllIndustries(
    clusters: ClusterInput[],
  ): Record<IndustryType, TaxonomyMappingResult> {
    const industries: IndustryType[] = [
      "BEAUTY",
      "FNB",
      "FINANCE",
      "ENTERTAINMENT",
    ];
    const results = {} as Record<IndustryType, TaxonomyMappingResult>;

    for (const industry of industries) {
      results[industry] = this.mapClusters(clusters, industry);
    }

    return results;
  }
}
