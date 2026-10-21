// tb_api_account.account_type 이 WMS(3PL) 인지. 화주 1차·2차 선택과 화주 셀렉터·필터는 이 계정에만
// 있다. 서버 isWMSAccountType(account_service.go) 과 같은 규칙(trim·대소문자 무시)으로, 비교를
// 화면마다 손으로 쓰다 기준이 갈려 조용히 어긋나는 일을 막는다.
export const isWmsAccount = (accountType: string | null | undefined): boolean =>
  (accountType ?? '').trim().toUpperCase() === 'WMS';
