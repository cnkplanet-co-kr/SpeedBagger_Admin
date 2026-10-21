// tb_api_account.account_type 이 WMS(3PL) 인지. 화주 1차·2차 선택과 화주 셀렉터·필터는 이 계정에만
// 있다. 서버 isWMSAccountType(account_service.go) 과 같은 규칙(trim·대소문자 무시)으로, 비교를
// 화면마다 손으로 쓰다 기준이 갈려 조용히 어긋나는 일을 막는다.
export const isWmsAccount = (accountType: string | null | undefined): boolean =>
  (accountType ?? '').trim().toUpperCase() === 'WMS';

// 계정에 창고 선택이 있는 OMS 인지. 셀메이트 OMS 와 셀메이트 WMS 는 API 호출 경로에 창고 id 가
// 들어가므로(sellmate_wms.go whPath) 창고를 고르지 않으면 어떤 호출도 되지 않는다. 두 시스템의
// 창고 id 는 별개 체계라 서로 바꿔 쓸 수 없다. 서버 WBS 타입 판정과 같이 trim·대소문자를 무시한다.
export const usesWarehouse = (wbsType: string | null | undefined): boolean => {
  const t = (wbsType ?? '').trim().toLowerCase();
  return t === 'sellmate' || t === 'sellmate-wms';
};
