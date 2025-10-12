import AdminGuard from "../components/AdminGuard";

export default function ReportAdmin() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-100 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="bg-white rounded-xl shadow p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              사용자 피드백 전달 현황
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              현재 스티커 메모로 접수된 피드백은 실시간으로 Telegram 봇을 통해
              관리자에게 전달됩니다. 별도의 저장소에는 보관하지 않으므로, 필요한
              경우 Telegram 메시지를 확인해주세요.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>
                Telegram에서 BotFather로 봇을 생성하고 토큰을 발급받습니다.
              </li>
              <li>
                피드백을 받을 채팅(개인 혹은 그룹)의 <code>chat_id</code>를
                확인합니다.
              </li>
              <li>
                Netlify 환경 변수에 <code>NETLIFY_TELEGRAM_BOT_TOKEN</code>과{" "}
                <code>NETLIFY_TELEGRAM_CHAT_ID</code>를 등록합니다.
              </li>
              <li>
                필요하다면 <code>NETLIFY_ADMIN_SECRET</code>을 설정해 이 페이지
                접근을 보호할 수 있습니다.
              </li>
            </ol>
            <p className="text-sm text-gray-600">
              모든 설정이 완료되면 메인 화면의 “⚡ 의견 남기기” 버튼을 통해
              제출된 내용이 바로 Telegram으로 전송됩니다.
            </p>
          </section>
        </div>
      </div>
    </AdminGuard>
  );
}
